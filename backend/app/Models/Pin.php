<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Pin extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'title', 'description', 'link', 'image_path',
        'image_width', 'image_height', 'dominant_color',
    ];

    protected function casts(): array
    {
        return [
            'image_width' => 'integer',
            'image_height' => 'integer',
            'likes_count' => 'integer',
            'comments_count' => 'integer',
            'saves_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function boards(): BelongsToMany
    {
        return $this->belongsToMany(Board::class)->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function likers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'likes')->withPivot('created_at');
    }

    /** Add is_liked / is_saved flags for the given viewer (false for guests). */
    public function scopeWithViewerState(\Illuminate\Database\Eloquent\Builder $query, ?User $viewer): void
    {
        if ($query->getQuery()->columns === null) {
            $query->select('pins.*');
        }
        if (! $viewer) {
            return;
        }
        $query->selectRaw(
            'exists(select 1 from likes where likes.pin_id = pins.id and likes.user_id = ?) as is_liked',
            [$viewer->id]
        )->selectRaw(
            'exists(select 1 from board_pin join boards on boards.id = board_pin.board_id where board_pin.pin_id = pins.id and boards.user_id = ?) as is_saved',
            [$viewer->id]
        );
    }

    public function imageUrl(): string
    {
        return str_starts_with($this->image_path, 'http') ? $this->image_path : Storage::disk('public')->url($this->image_path);
    }
}
