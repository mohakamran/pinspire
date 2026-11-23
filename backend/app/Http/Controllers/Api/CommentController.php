<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Pin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommentController extends Controller
{
    public function index(Request $request, Pin $pin)
    {
        return CommentResource::collection(
            $pin->comments()->with(['user', 'pin:id,user_id'])->latest()->latest('id')
                ->paginate(max(1, min(50, $request->integer('per_page', 20))))
        );
    }

    public function store(Request $request, Pin $pin)
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:500']]);
        $comment = DB::transaction(function () use ($request, $pin, $data) {
            $comment = $pin->comments()->create(['user_id' => $request->user()->id, 'body' => trim($data['body'])]);
            $pin->increment('comments_count');

            return $comment;
        });

        return (new CommentResource($comment->load(['user', 'pin:id,user_id'])))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Comment $comment)
    {
        $user = $request->user();
        abort_unless($user->id === $comment->user_id || $user->id === $comment->pin->user_id, 403, 'You cannot delete this comment.');
        DB::transaction(function () use ($comment) {
            $comment->delete();
            Pin::whereKey($comment->pin_id)->where('comments_count', '>', 0)->decrement('comments_count');
        });

        return response()->noContent();
    }
}
