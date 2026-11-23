<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PinResource;
use App\Models\Pin;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PinController extends Controller
{
    /** Home feed. ?feed=following limits to followed users (auth required). */
    public function index(Request $request)
    {
        $viewer = $request->user('sanctum');
        $query = Pin::query()->withViewerState($viewer)->with('user');

        if ($request->query('feed') === 'following') {
            abort_unless($viewer, 401, 'Log in to see your following feed.');
            $query->whereIn('pins.user_id', $viewer->following()->select('users.id'));
        }

        return PinResource::collection(
            $query->latest('pins.created_at')->latest('pins.id')->paginate($this->perPage($request))
        );
    }

    public function show(Request $request, Pin $pin)
    {
        $pin = Pin::query()->withViewerState($request->user('sanctum'))
            ->with(['user' => fn ($q) => $q->withCount('followers')])
            ->findOrFail($pin->id);
        if ($viewer = $request->user('sanctum')) {
            $pin->user->is_following = $viewer->following()->whereKey($pin->user_id)->exists();
        }

        return new PinResource($pin);
    }

    public function store(Request $request, ImageService $images)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:800'],
            'link' => ['nullable', 'url', 'max:2048'],
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:10240'],
            'board_id' => ['nullable', 'integer'],
        ]);

        $board = null;
        if (! empty($data['board_id'])) {
            $board = $request->user()->boards()->find($data['board_id']);
            abort_unless($board, 422, 'Choose one of your own boards.');
        }

        $img = $images->store($request->file('image'), 'pins');
        $pin = DB::transaction(function () use ($request, $data, $img, $board) {
            $pin = $request->user()->pins()->create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'link' => $data['link'] ?? null,
                'image_path' => $img['path'],
                'image_width' => $img['width'],
                'image_height' => $img['height'],
                'dominant_color' => $img['color'],
            ]);
            if ($board) {
                $board->pins()->attach($pin->id);
                $board->touch();
                $pin->increment('saves_count');
            }

            return $pin;
        });

        return (new PinResource($pin->load('user')))->response()->setStatusCode(201);
    }

    public function update(Request $request, Pin $pin)
    {
        abort_unless($request->user()->id === $pin->user_id, 403, 'You can only edit your own pins.');
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:800'],
            'link' => ['nullable', 'url', 'max:2048'],
        ]);
        $pin->update($data);

        return new PinResource($pin->load('user'));
    }

    public function destroy(Request $request, Pin $pin)
    {
        abort_unless($request->user()->id === $pin->user_id, 403, 'You can only delete your own pins.');
        $path = $pin->image_path;
        $pin->delete();
        if (! str_starts_with($path, 'http') && ! str_starts_with($path, 'seed/')) {
            Storage::disk('public')->delete($path);
        }

        return response()->noContent();
    }

    /**
     * Related pins: pins sharing a board with this pin, plus FULLTEXT matches on the title,
     * ranked by co-occurrence then relevance; falls back to recent pins.
     */
    public function related(Request $request, Pin $pin)
    {
        $viewer = $request->user('sanctum');
        $boardIds = $pin->boards()->pluck('boards.id');
        $terms = $this->booleanTerms($pin->title.' '.$pin->description);

        $query = Pin::query()->withViewerState($viewer)->with('user')
            ->where('pins.id', '!=', $pin->id)
            ->selectRaw(
                '(select count(*) from board_pin bp where bp.pin_id = pins.id and bp.board_id in ('.($boardIds->isEmpty() ? '0' : $boardIds->implode(',')).')) as co_boards'
            );
        if ($terms !== '') {
            $query->selectRaw('match(title, description) against (? in boolean mode) as relevance', [$terms]);
        } else {
            $query->selectRaw('0 as relevance');
        }
        $query->orderByDesc('co_boards')->orderByDesc('relevance')->latest('pins.created_at');

        return PinResource::collection($query->paginate($this->perPage($request)));
    }

    private function booleanTerms(string $text): string
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY);
        $stop = ['the', 'and', 'for', 'with', 'your', 'this', 'that', 'from', 'into', 'are'];
        $words = array_values(array_unique(array_filter($words, fn ($w) => mb_strlen($w) >= 3 && ! in_array($w, $stop))));

        return implode(' ', array_slice($words, 0, 12));
    }

    private function perPage(Request $request): int
    {
        return max(1, min(50, (int) $request->query('per_page', 24)));
    }
}
