<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ql_y_te already contains the application's data.
        $this->call(MedicationReactionSampleSeeder::class);
    }
}
