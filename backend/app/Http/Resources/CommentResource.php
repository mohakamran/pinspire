<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Comment */
class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user('sanctum');

        return [
            'id' => $this->id,
            'body' => $this->body,
            'user' => new UserResource($this->whenLoaded('user')),
            'can_delete' => $viewer ? ($viewer->id === $this->user_id || $viewer->id === $this->pin?->user_id) : false,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
