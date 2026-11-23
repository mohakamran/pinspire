<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\LikeController;
use App\Http\Controllers\Api\PinController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Auth
Route::middleware('throttle:20,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

// Public reads (viewer state added when a Bearer token is sent)
Route::get('/pins', [PinController::class, 'index']);
Route::get('/pins/{pin}', [PinController::class, 'show']);
Route::get('/pins/{pin}/related', [PinController::class, 'related']);
Route::get('/pins/{pin}/comments', [CommentController::class, 'index']);
Route::get('/search/pins', [SearchController::class, 'pins']);
Route::get('/search/users', [SearchController::class, 'users']);
Route::get('/search/boards', [SearchController::class, 'boards']);
Route::get('/search/suggest', [SearchController::class, 'suggest']);
Route::get('/users/{user}', [UserController::class, 'show']);
Route::get('/users/{user}/pins', [UserController::class, 'pins']);
Route::get('/users/{user}/boards', [BoardController::class, 'forUser']);
Route::get('/users/{user}/boards/{slug}', [BoardController::class, 'show']);
Route::get('/users/{user}/followers', [FollowController::class, 'followers']);
Route::get('/users/{user}/following', [FollowController::class, 'following']);
Route::get('/boards/{board}/pins', [BoardController::class, 'pins']);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/me', [UserController::class, 'updateMe']); // multipart (avatar)

    Route::post('/pins', [PinController::class, 'store']);
    Route::patch('/pins/{pin}', [PinController::class, 'update']);
    Route::delete('/pins/{pin}', [PinController::class, 'destroy']);

    Route::post('/pins/{pin}/like', [LikeController::class, 'store']);
    Route::delete('/pins/{pin}/like', [LikeController::class, 'destroy']);

    Route::post('/pins/{pin}/comments', [CommentController::class, 'store']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    Route::post('/boards', [BoardController::class, 'store']);
    Route::patch('/boards/{board}', [BoardController::class, 'update']);
    Route::delete('/boards/{board}', [BoardController::class, 'destroy']);
    Route::post('/boards/{board}/pins/{pin}', [BoardController::class, 'addPin']);
    Route::delete('/boards/{board}/pins/{pin}', [BoardController::class, 'removePin']);

    Route::post('/users/{user}/follow', [FollowController::class, 'store']);
    Route::delete('/users/{user}/follow', [FollowController::class, 'destroy']);
});
