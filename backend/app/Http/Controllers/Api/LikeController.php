<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LikeController extends Controller
{
    public function store(Request $request, Pin $pin)
    {
        $inserted = DB::table('likes')->insertOrIgnore(['pin_id' => $pin->id, 'user_id' => $request->user()->id, 'created_at' => now()]);
        if ($inserted) {
            $pin->increment('likes_count');
        }

        return response()->json(['liked' => true, 'likes_count' => $pin->fresh()->likes_count]);
    }

    public function destroy(Request $request, Pin $pin)
    {
        $deleted = DB::table('likes')->where(['pin_id' => $pin->id, 'user_id' => $request->user()->id])->delete();
        if ($deleted && $pin->likes_count > 0) {
            $pin->decrement('likes_count');
        }

        return response()->json(['liked' => false, 'likes_count' => $pin->fresh()->likes_count]);
    }
}
