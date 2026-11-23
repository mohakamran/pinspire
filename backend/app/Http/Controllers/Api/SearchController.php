<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Http\Resources\PinResource;
use App\Http\Resources\UserResource;
use App\Models\Board;
use App\Models\Pin;
use App\Models\User;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /** Pin search: MySQL FULLTEXT (boolean, prefix) with LIKE fallback for short terms. */
    public function pins(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        abort_if($q === '', 422, 'Enter something to search for.');
        $terms = $this->terms($q);
        $query = Pin::query()->withViewerState($request->user('sanctum'))->with('user');

        if ($terms !== '') {
            $query->whereRaw('match(title, description) against (? in boolean mode)', [$terms])
                ->selectRaw('match(title, description) against (? in boolean mode) as relevance', [$terms])
                ->orderByDesc('relevance');
        } else {
            $like = '%'.addcslashes($q, '%_\\').'%';
            $query->where(fn ($w) => $w->where('title', 'like', $like)->orWhere('description', 'like', $like));
        }

        return PinResource::collection($query->latest('pins.created_at')->paginate(max(1, min(50, $request->integer('per_page', 24)))));
    }

    public function users(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        abort_if($q === '', 422, 'Enter something to search for.');
        $like = '%'.addcslashes($q, '%_\\').'%';

        return UserResource::collection(
            User::where(fn ($w) => $w->where('name', 'like', $like)->orWhere('username', 'like', $like))
                ->withCount('followers')->orderByDesc('followers_count')->paginate(20)
        );
    }

    public function boards(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        abort_if($q === '', 422, 'Enter something to search for.');
        $like = '%'.addcslashes($q, '%_\\').'%';

        return BoardResource::collection(
            Board::where('is_private', false)->where('name', 'like', $like)->withCount('pins')->with('user')->paginate(20)
        );
    }

    /** Suggestions for the search box: matching pin titles and users. */
    public function suggest(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['queries' => [], 'users' => []]);
        }
        $like = '%'.addcslashes($q, '%_\\').'%';
        $titles = Pin::where('title', 'like', $like)->orderByDesc('saves_count')->limit(30)->pluck('title')
            ->map(fn ($t) => mb_strtolower($t))->unique()->take(6)->values();
        $users = User::where('name', 'like', $like)->orWhere('username', 'like', $like)->limit(4)->get();

        return response()->json(['queries' => $titles, 'users' => UserResource::collection($users)]);
    }

    private function terms(string $q): string
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($q), -1, PREG_SPLIT_NO_EMPTY);
        $words = array_filter($words, fn ($w) => mb_strlen($w) >= 3);

        return implode(' ', array_map(fn ($w) => '+'.$w.'*', array_slice(array_values($words), 0, 8)));
    }
}
