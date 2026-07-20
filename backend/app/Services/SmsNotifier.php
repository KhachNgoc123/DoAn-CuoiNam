<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsNotifier
{
    public function sendMedicationReminder(string $phone, string $message): bool
    {
        if (! $this->isConfigured() || ! $phone) {
            return false;
        }

        try {
            $response = Http::asForm()
                ->withBasicAuth((string) config('services.twilio.sid'), (string) config('services.twilio.token'))
                ->post('https://api.twilio.com/2010-04-01/Accounts/'.config('services.twilio.sid').'/Messages.json', [
                    'From' => config('services.twilio.from'),
                    'To' => $this->normalizePhone($phone),
                    'Body' => $message,
                ]);

            return $response->successful();
        } catch (\Throwable $error) {
            Log::warning('Twilio SMS failed', ['message' => $error->getMessage()]);
            return false;
        }
    }

    private function isConfigured(): bool
    {
        return (bool) (
            config('services.twilio.sid')
            && config('services.twilio.token')
            && config('services.twilio.from')
        );
    }

    private function normalizePhone(string $phone): string
    {
        $clean = preg_replace('/\D+/', '', $phone) ?: '';
        if (str_starts_with($clean, '84')) {
            return '+'.$clean;
        }

        if (str_starts_with($clean, '0')) {
            return (string) config('services.twilio.country_code', '+84').substr($clean, 1);
        }

        return str_starts_with($phone, '+') ? $phone : '+'.$clean;
    }
}
