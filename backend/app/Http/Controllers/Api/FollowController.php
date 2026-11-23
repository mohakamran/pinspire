<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    public function store(Request $request, User $user)
    {
        $me = $request->user();
        abort_if($me->id === $user->id, 422, 'You cannot follow yourself.');
        $me->following()->syncWithoutDetaching([$user->id => ['created_at' => now()]]);

        return response()->json(['following' => true, 'followers_count' => $user->followers()->count()]);
    }

    public function destroy(Request $request, User $user)
    {
        $request->user()->following()->detach($user->id);

        return response()->json(['following' => false, 'followers_count' => $user->followers()->count()]);
    }

    public function followers(Request $request, User $user)
    {
        return $this->list($request, $user->followers());
    }

    public function following(Request $request, User $user)
    {
        return $this->list($request, $user->following());
    }

    private function list(Request $request, $relation)
    {
        $viewer = $request->user('sanctum');
        $page = $relation->withCount('followers')->orderByPivot('created_at', 'desc')->paginate(30);
        if ($viewer) {
            $followed = $viewer->following()->whereIn('users.id', $page->pluck('id'))->pluck('users.id')->all();
            $page->getCollection()->each(fn ($u) => $u->is_following = in_array($u->id, $followed));
        }

        return UserResource::collection($page);
    }
}
