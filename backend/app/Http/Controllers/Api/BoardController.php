<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Http\Resources\PinResource;
use App\Models\Board;
use App\Models\Pin;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BoardController extends Controller
{
    /** Boards of a user (private boards only for the owner). ?pin_id=N adds has_pin for the save picker. */
    public function forUser(Request $request, User $user)
    {
        $viewer = $request->user('sanctum');
        $query = $user->boards()->withCount('pins')->with('user')->latest('updated_at');
        if (! $viewer || $viewer->id !== $user->id) {
            $query->where('is_private', false);
        }
        if ($pinId = $request->integer('pin_id')) {
            $query->addSelect(['has_pin' => DB::table('board_pin')->selectRaw('count(*) > 0')
                ->whereColumn('board_pin.board_id', 'boards.id')->where('board_pin.pin_id', $pinId)]);
        }
        $boards = $query->get();
        $this->attachCovers($boards);

        return BoardResource::collection($boards);
    }

    public function show(Request $request, User $user, string $slug)
    {
        $board = $user->boards()->where('slug', $slug)->withCount('pins')->with('user')->firstOrFail();
        abort_unless($board->isVisibleTo($request->user('sanctum')), 404);

        return new BoardResource($board);
    }

    public function pins(Request $request, Board $board)
    {
        $viewer = $request->user('sanctum');
        abort_unless($board->isVisibleTo($viewer), 404);
        $pins = Pin::query()->withViewerState($viewer)->with('user')
            ->join('board_pin', 'board_pin.pin_id', '=', 'pins.id')
            ->where('board_pin.board_id', $board->id)
            ->orderByDesc('board_pin.created_at')
            ->paginate(max(1, min(50, $request->integer('per_page', 24))));

        return PinResource::collection($pins);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('boards')->where('user_id', $user->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'is_private' => ['sometimes', 'boolean'],
        ], ['name.unique' => 'You already have a board with this name.']);

        $board = $user->boards()->create([...$data, 'slug' => $this->uniqueSlug($user, $data['name'])]);

        return (new BoardResource($board->loadCount('pins')->load('user')))->response()->setStatusCode(201);
    }

    public function update(Request $request, Board $board)
    {
        $this->authorizeOwner($request, $board);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:50',
                Rule::unique('boards')->where('user_id', $board->user_id)->ignore($board->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'is_private' => ['sometimes', 'boolean'],
        ], ['name.unique' => 'You already have a board with this name.']);
        if (isset($data['name']) && $data['name'] !== $board->name) {
            $data['slug'] = $this->uniqueSlug($request->user(), $data['name'], $board->id);
        }
        $board->update($data);

        return new BoardResource($board->loadCount('pins')->load('user'));
    }

    public function destroy(Request $request, Board $board)
    {
        $this->authorizeOwner($request, $board);
        DB::transaction(function () use ($board) {
            $pinIds = $board->pins()->pluck('pins.id');
            $board->delete();
            Pin::whereIn('id', $pinIds)->where('saves_count', '>', 0)->decrement('saves_count');
        });

        return response()->noContent();
    }

    public function addPin(Request $request, Board $board, Pin $pin)
    {
        $this->authorizeOwner($request, $board);
        $attached = $board->pins()->syncWithoutDetaching([$pin->id])['attached'];
        if ($attached) {
            $pin->increment('saves_count');
            $board->touch();
        }

        return response()->json(['saved' => true, 'board_id' => $board->id, 'saves_count' => $pin->fresh()->saves_count]);
    }

    public function removePin(Request $request, Board $board, Pin $pin)
    {
        $this->authorizeOwner($request, $board);
        if ($board->pins()->detach($pin->id) && $pin->saves_count > 0) {
            $pin->decrement('saves_count');
        }

        return response()->json(['saved' => false, 'board_id' => $board->id, 'saves_count' => $pin->fresh()->saves_count]);
    }

    private function authorizeOwner(Request $request, Board $board): void
    {
        abort_unless($request->user()->id === $board->user_id, 403, 'You can only change your own boards.');
    }

    private function uniqueSlug(User $user, string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'board';
        $slug = $base;
        $i = 2;
        while ($user->boards()->where('slug', $slug)->when($ignoreId, fn (Builder $q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    /** Up to 3 most recent pin images per board, for collage covers. */
    private function attachCovers($boards): void
    {
        if ($boards->isEmpty()) {
            return;
        }
        $rows = DB::table('board_pin')->join('pins', 'pins.id', '=', 'board_pin.pin_id')
            ->whereIn('board_pin.board_id', $boards->pluck('id'))
            ->orderByDesc('board_pin.created_at')
            ->get(['board_pin.board_id', 'pins.image_path']);
        $byBoard = $rows->groupBy('board_id');
        foreach ($boards as $board) {
            $board->cover_images = ($byBoard[$board->id] ?? collect())->take(3)
                ->map(fn ($r) => (new Pin(['image_path' => $r->image_path]))->imageUrl())->values()->all();
        }
    }
}
