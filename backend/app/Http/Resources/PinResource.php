<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Pin */
class PinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user('sanctum');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'link' => $this->link,
            'image_url' => $this->imageUrl(),
            'image_width' => $this->image_width,
            'image_height' => $this->image_height,
            'dominant_color' => $this->dominant_color,
            'likes_count' => $this->likes_count,
            'comments_count' => $this->comments_count,
            'saves_count' => $this->saves_count,
            'is_liked' => (bool) ($this->is_liked ?? false),
            'is_saved' => (bool) ($this->is_saved ?? false),
            'is_owner' => $viewer ? $viewer->id === $this->user_id : false,
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
