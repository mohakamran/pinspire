<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user('sanctum');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'avatar_url' => $this->avatarUrl(),
            'bio' => $this->bio,
            'website' => $this->website,
            'email' => $this->when($viewer && $viewer->id === $this->id, $this->email),
            'followers_count' => $this->whenCounted('followers'),
            'following_count' => $this->whenCounted('following'),
            'pins_count' => $this->whenCounted('pins'),
            'is_following' => $this->when(
                isset($this->is_following),
                fn () => (bool) $this->is_following
            ),
            'is_me' => $viewer ? $viewer->id === $this->id : false,
        ];
    }
}
