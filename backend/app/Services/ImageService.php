<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class ImageService
{
    /**
     * Store an uploaded image on the public disk and return path, size and dominant colour.
     *
     * @return array{path: string, width: int, height: int, color: string}
     */
    public function store(UploadedFile $file, string $dir): array
    {
        [$width, $height] = getimagesize($file->getRealPath()) ?: [0, 0];
        $ext = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg');
        $path = $file->storeAs($dir, Str::uuid().'.'.$ext, 'public');

        return [
            'path' => $path,
            'width' => (int) $width,
            'height' => (int) $height,
            'color' => $this->dominantColor($file->getRealPath()),
        ];
    }

    public function dominantColor(string $absolutePath): string
    {
        try {
            $data = @file_get_contents($absolutePath);
            $img = $data !== false ? @imagecreatefromstring($data) : false;
            if (! $img) {
                return '#e9e9e9';
            }
            $pixel = imagecreatetruecolor(1, 1);
            imagecopyresampled($pixel, $img, 0, 0, 0, 0, 1, 1, imagesx($img), imagesy($img));
            $rgb = imagecolorat($pixel, 0, 0);

            return sprintf('#%02x%02x%02x', ($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF);
        } catch (\Throwable) {
            return '#e9e9e9';
        }
    }
}
