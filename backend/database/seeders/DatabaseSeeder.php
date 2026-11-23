<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\Pin;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Seeds demo users, boards, pins (with locally generated artwork), comments, likes and follows.
 * Demo login: demo@pinspire.test / password123 (all seeded users share this password).
 */
class DatabaseSeeder extends Seeder
{
    private const TOPICS = [
        'home' => [['#f4e9dc', '#c8a27a', '#6b4f3a'], ['Cozy living room corner', 'Minimal bedroom styling', 'Warm reading nook ideas', 'Neutral living room decor', 'Small apartment layout tips', 'Boho shelf arrangement']],
        'food' => [['#fff1e0', '#f28c38', '#b23a1f'], ['Easy weeknight pasta', 'Lemon garlic salmon', 'Rustic sourdough bread', 'Holiday cookie platter', 'Spicy ramen bowl', 'Fresh summer salad']],
        'travel' => [['#e3f4fb', '#3fa7d6', '#1d3557'], ['Coastal road trip plan', 'Mountain cabin weekend', 'City break in Lisbon', 'Island hopping guide', 'Desert sunset camping', 'Hidden lake hike']],
        'garden' => [['#ecf7e4', '#6fbf73', '#2d6a4f'], ['Balcony herb garden', 'Indoor plant shelf', 'Succulent arrangement', 'Spring flower beds', 'Vertical garden wall', 'Easy care houseplants']],
        'fashion' => [['#fbeef2', '#e07a9a', '#7b2d4a'], ['Autumn outfit layers', 'Capsule wardrobe basics', 'Street style inspiration', 'Vintage denim looks', 'Minimal jewelry ideas', 'Weekend casual outfit']],
        'art' => [['#eeeafc', '#8e7cc3', '#3c2a78'], ['Watercolor landscape study', 'Abstract color palette', 'Pottery glaze ideas', 'Sketchbook daily prompts', 'Geometric wall art', 'Paper craft garland']],
    ];

    private const USERS = [
        ['Demo User', 'demo', 'demo@pinspire.test', 'Collecting ideas for my next project.'],
        ['Amira Khan', 'amira', 'amira@pinspire.test', 'Interior stylist. Warm neutrals forever.'],
        ['Leo Martins', 'leo', 'leo@pinspire.test', 'Home cook and bread nerd.'],
        ['Sana Iqbal', 'sana', 'sana@pinspire.test', 'Travel planner, map lover.'],
        ['Noah Becker', 'noah', 'noah@pinspire.test', 'Plants, plants and more plants.'],
        ['Maya Chen', 'maya', 'maya@pinspire.test', 'Everyday outfits and thrift finds.'],
        ['Omar Haddad', 'omar', 'omar@pinspire.test', 'Illustrator. Color experiments.'],
    ];

    private const COMMENTS = [
        'Love this idea!', 'Saving this for later.', 'The colors are beautiful.', 'Trying this weekend!',
        'Where is this from?', 'So inspiring, thanks for sharing.', 'This is exactly what I needed.', 'Great composition.',
    ];

    public function run(): void
    {
        mt_srand(42);
        Storage::disk('public')->deleteDirectory('seed');
        Storage::disk('public')->makeDirectory('seed');

        $users = collect(self::USERS)->map(fn ($u, $i) => User::create([
            'name' => $u[0], 'username' => $u[1], 'email' => $u[2], 'bio' => $u[3],
            'password' => 'password123',
            'avatar_path' => $this->avatar($u[1], array_values(self::TOPICS)[$i % 6][0]),
        ]));

        // Each non-demo user owns one topic; demo gets a mix.
        $topicOwners = ['home' => 1, 'food' => 2, 'travel' => 3, 'garden' => 4, 'fashion' => 5, 'art' => 6];
        $pins = collect();
        $n = 0;
        foreach (self::TOPICS as $topic => [$palette, $titles]) {
            $owner = $users[$topicOwners[$topic]];
            $board = $owner->boards()->create(['name' => ucfirst($topic).' inspiration', 'slug' => $topic.'-inspiration',
                'description' => 'Favourite '.$topic.' ideas.']);
            foreach ($titles as $i => $title) {
                foreach ([0, 1] as $variant) {
                    $n++;
                    [$w, $h] = [[600, 900], [600, 750], [600, 600], [600, 1100], [600, 820], [600, 680]][($i + $variant * 3) % 6];
                    $path = $this->artwork("seed/{$topic}-{$i}-{$variant}.jpg", $w, $h, $palette, $variant ? $title.' II' : $title);
                    $pin = Pin::create([
                        'user_id' => $variant && $i % 2 ? $users[0]->id : $owner->id,
                        'title' => $variant ? $title.' (variation)' : $title,
                        'description' => "A {$topic} idea: ".strtolower($title).'. Save it to a board and try it yourself.',
                        'link' => null,
                        'image_path' => $path, 'image_width' => $w, 'image_height' => $h,
                        'dominant_color' => $palette[1],
                    ]);
                    $pin->created_at = now()->subMinutes(mt_rand(5, 60 * 24 * 30));
                    $pin->save();
                    $board->pins()->attach($pin->id, ['created_at' => $pin->created_at, 'updated_at' => $pin->created_at]);
                    $pins->push($pin);
                }
            }
        }

        // Demo user's boards
        $demo = $users[0];
        $saved = $demo->boards()->create(['name' => 'Saved ideas', 'slug' => 'saved-ideas']);
        $dream = $demo->boards()->create(['name' => 'Dream home', 'slug' => 'dream-home', 'description' => 'One day.']);
        $saved->pins()->attach($pins->random(6)->pluck('id'));
        $dream->pins()->attach($pins->filter(fn ($p) => str_contains($p->image_path, 'home'))->take(5)->pluck('id'));
        foreach ($users->slice(1) as $u) {
            $u->boards()->firstOrCreate(['slug' => 'saved-ideas'], ['name' => 'Saved ideas'])
                ->pins()->syncWithoutDetaching($pins->random(4)->pluck('id'));
        }

        // Likes, comments, follows
        foreach ($pins as $pin) {
            foreach ($users->random(mt_rand(0, 5)) as $u) {
                DB::table('likes')->insertOrIgnore(['pin_id' => $pin->id, 'user_id' => $u->id, 'created_at' => now()]);
            }
            foreach (range(1, mt_rand(0, 3)) as $_) {
                $pin->comments()->create(['user_id' => $users->random()->id, 'body' => self::COMMENTS[array_rand(self::COMMENTS)]]);
            }
        }
        foreach ($users as $u) {
            foreach ($users->where('id', '!=', $u->id)->random(3) as $other) {
                $u->following()->syncWithoutDetaching([$other->id => ['created_at' => now()]]);
            }
        }
        // demo follows amira but NOT omar, so the follow flow can be tested on omar
        $demo->following()->detach($users[6]->id);
        $users[6]->following()->detach($demo->id);

        // Denormalised counters
        DB::statement('update pins set
            likes_count = (select count(*) from likes where likes.pin_id = pins.id),
            comments_count = (select count(*) from comments where comments.pin_id = pins.id),
            saves_count = (select count(*) from board_pin where board_pin.pin_id = pins.id)');
    }

    /** Generate an abstract gradient artwork with soft shapes and a caption. */
    private function artwork(string $path, int $w, int $h, array $palette, string $caption): string
    {
        $img = imagecreatetruecolor($w, $h);
        [$a, $b, $c] = array_map(fn ($hex) => sscanf($hex, '#%02x%02x%02x'), $palette);
        for ($y = 0; $y < $h; $y++) {
            $t = $y / $h;
            $col = imagecolorallocate($img, (int) ($a[0] + ($b[0] - $a[0]) * $t), (int) ($a[1] + ($b[1] - $a[1]) * $t), (int) ($a[2] + ($b[2] - $a[2]) * $t));
            imageline($img, 0, $y, $w, $y, $col);
        }
        imagealphablending($img, true);
        for ($i = 0; $i < 7; $i++) {
            $src = $i % 2 ? $c : $a;
            $col = imagecolorallocatealpha($img, $src[0], $src[1], $src[2], mt_rand(55, 95));
            $r = mt_rand((int) ($w * 0.15), (int) ($w * 0.6));
            if ($i % 3 === 0) {
                imagefilledrectangle($img, mt_rand(-50, $w), mt_rand(-50, $h), mt_rand(0, $w + 50), mt_rand(0, $h + 50), $col);
            } else {
                imagefilledellipse($img, mt_rand(0, $w), mt_rand(0, $h), $r, $r, $col);
            }
        }
        $font = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
        $white = imagecolorallocatealpha($img, 255, 255, 255, 10);
        $shade = imagecolorallocatealpha($img, 0, 0, 0, 80);
        $lines = explode("\n", wordwrap($caption, 16, "\n", true));
        $y0 = $h - 60 - 46 * (count($lines) - 1);
        foreach ($lines as $k => $line) {
            if (is_file($font)) {
                imagettftext($img, 34, 0, 42, $y0 + 46 * $k + 2, $shade, $font, $line);
                imagettftext($img, 34, 0, 40, $y0 + 46 * $k, $white, $font, $line);
            } else {
                imagestring($img, 5, 40, $y0 + 20 * $k, $line, $white);
            }
        }
        ob_start();
        imagejpeg($img, null, 85);
        Storage::disk('public')->put($path, ob_get_clean());

        return $path;
    }

    private function avatar(string $username, array $palette): string
    {
        $s = 200;
        $img = imagecreatetruecolor($s, $s);
        [$r, $g, $b] = sscanf($palette[2], '#%02x%02x%02x');
        imagefill($img, 0, 0, imagecolorallocate($img, $r, $g, $b));
        $white = imagecolorallocate($img, 255, 255, 255);
        $font = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
        if (is_file($font)) {
            imagettftext($img, 90, 0, 48, 140, $white, $font, strtoupper($username[0]));
        }
        ob_start();
        imagepng($img);
        $path = "seed/avatar-{$username}.png";
        Storage::disk('public')->put($path, ob_get_clean());

        return $path;
    }
}
