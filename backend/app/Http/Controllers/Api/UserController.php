<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PinResource;
use App\Http\Resources\UserResource;
use App\Models\Pin;
use App\Models\User;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function show(Request $request, User $user)
    {
        $user->loadCount(['followers', 'following', 'pins']);
        if ($viewer = $request->user('sanctum')) {
            $user->is_following = $viewer->following()->whereKey($user->id)->exists();
        }

        return new UserResource($user);
    }

    /** Pins created by the user. */
    public function pins(Request $request, User $user)
    {
        return PinResource::collection(
            Pin::query()->withViewerState($request->user('sanctum'))->with('user')
                ->where('pins.user_id', $user->id)->latest('pins.created_at')
                ->paginate(max(1, min(50, $request->integer('per_page', 24))))
        );
    }

    public function updateMe(Request $request, ImageService $images)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:60'],
            'username' => ['sometimes', 'required', 'string', 'min:3', 'max:30', 'regex:/^[a-zA-Z0-9_]+$/', 'not_in:login,register,create,search,pin,settings,api,storage,boards,users,admin', Rule::unique('users')->ignore($user->id)],
            'bio' => ['nullable', 'string', 'max:500'],
            'website' => ['nullable', 'url', 'max:255'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        if ($request->hasFile('avatar')) {
            $data['avatar_path'] = $images->store($request->file('avatar'), 'avatars')['path'];
        }
        unset($data['avatar']);
        if (isset($data['username'])) {
            $data['username'] = strtolower($data['username']);
        }
        $user->update($data);

        return new UserResource($user->loadCount(['followers', 'following', 'pins']));
    }
}
