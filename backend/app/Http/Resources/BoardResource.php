<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Board */
class BoardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user('sanctum');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'is_private' => $this->is_private,
            'pins_count' => $this->whenCounted('pins'),
            'cover_images' => $this->when(isset($this->cover_images), fn () => $this->cover_images),
            'has_pin' => $this->when(isset($this->has_pin), fn () => (bool) $this->has_pin),
            'is_owner' => $viewer ? $viewer->id === $this->user_id : false,
            'user' => new UserResource($this->whenLoaded('user')),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
