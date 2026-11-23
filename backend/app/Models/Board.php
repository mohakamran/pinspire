<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Board extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'name', 'slug', 'description', 'is_private'];

    protected function casts(): array
    {
        return ['is_private' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pins(): BelongsToMany
    {
        return $this->belongsToMany(Pin::class)->withTimestamps();
    }

    public function isVisibleTo(?User $viewer): bool
    {
        return ! $this->is_private || ($viewer && $viewer->id === $this->user_id);
    }
}
