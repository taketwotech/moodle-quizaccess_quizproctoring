<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * On-demand plan and user-info synchronization.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_quizproctoring;

defined('MOODLE_INTERNAL') || die();

/**
 * Synchronizes ProctorLink plan and user-info with the remote API.
 */
class plan_sync {
    /** @var int Default minimum minutes between automatic syncs (12 hours). */
    public const DEFAULT_INTERVAL_MINUTES = 720;

    /**
     * Sync plan and user info when cached data is stale.
     *
     * @param bool $force When true, bypass the throttle interval.
     * @param callable|null $logger Optional logger accepting a string message.
     * @return array{skipped: bool, userinfo: bool, plan: bool}
     */
    public static function sync_if_stale(bool $force = false, ?callable $logger = null): array {
        $result = [
            'skipped' => false,
            'userinfo' => false,
            'plan' => false,
        ];

        if (!$force && !self::is_stale()) {
            $result['skipped'] = true;
            return $result;
        }

        set_config('getplanlastattempttime', time(), 'quizaccess_quizproctoring');

        $result['userinfo'] = self::sync_userinfo($logger);
        $result['plan'] = self::sync_plan($logger);

        if ($result['userinfo'] || $result['plan']) {
            set_config('getplansynctime', time(), 'quizaccess_quizproctoring');
        }

        return $result;
    }

    /**
     * Whether cached plan data should be refreshed.
     *
     * @return bool
     */
    public static function is_stale(): bool {
        $lastattempt = (int) get_config('quizaccess_quizproctoring', 'getplanlastattempttime');
        $lastsync = (int) get_config('quizaccess_quizproctoring', 'getplansynctime');
        $reference = max($lastattempt, $lastsync);
        if ($reference === 0) {
            return true;
        }

        $intervalminutes = (int) get_config('quizaccess_quizproctoring', 'plansync_interval');
        if ($intervalminutes <= 0) {
            $intervalminutes = self::DEFAULT_INTERVAL_MINUTES;
        }

        return (time() - $reference) >= ($intervalminutes * MINSECS);
    }

    /**
     * Fetch and store user activation status.
     *
     * @param callable|null $logger
     * @return bool True when user info was updated successfully.
     */
    public static function sync_userinfo(?callable $logger = null): bool {
        try {
            $response = api::getuserinfo();
            if (api::is_api_failure($response)) {
                self::log($logger, 'Invalid or failed response from getuserinfo API.');
                return false;
            }

            $responsedata = json_decode($response, true);
            if (!is_array($responsedata) || !array_key_exists('active', $responsedata)) {
                self::log($logger, 'Invalid response structure from getuserinfo API.');
                return false;
            }

            $status = $responsedata['active'] ? 1 : 0;
            set_config('getuserinfo', $status, 'quizaccess_quizproctoring');
            self::log($logger, 'User info status updated: ' . $status);
            return true;
        } catch (\Exception $exception) {
            self::log($logger, 'Error syncing user info: ' . $exception->getMessage());
            return false;
        }
    }

    /**
     * Fetch and store plan details.
     *
     * @param callable|null $logger
     * @return bool True when plan info was updated successfully.
     */
    public static function sync_plan(?callable $logger = null): bool {
        try {
            $planresponse = api::getplaninfo();
            if (api::is_api_failure($planresponse)) {
                self::log($logger, 'Plan sync skipped: API request failed; using cached plan data.');
                return false;
            }

            self::apply_plan_response($planresponse);
            self::log($logger, 'Plan details updated from API.');
            return true;
        } catch (\Exception $exception) {
            self::log($logger, 'Error syncing plan info: ' . $exception->getMessage());
            return false;
        }
    }

    /**
     * Parse a plan API response and persist plugin configuration.
     *
     * @param string $planresponse Raw JSON response from the plan-details API.
     */
    public static function apply_plan_response(string $planresponse): void {
        $data = json_decode($planresponse, true);
        if (!is_array($data)) {
            return;
        }

        $plantype = isset($data['plan']['planType']) ? $data['plan']['planType'] : '';

        if (!empty($plantype)) {
            set_config('getplanresponseempty', 0, 'quizaccess_quizproctoring');
        } else {
            set_config('getplanresponseempty', 1, 'quizaccess_quizproctoring');
        }

        if ($plantype === 'credit') {
            $credits = isset($data['plan']['details']['credits']) ? (int) $data['plan']['details']['credits'] : 0;

            $totalcreditsbought = 0;
            if (isset($data['plan']['details']['creditHistory']) && is_array($data['plan']['details']['creditHistory'])) {
                foreach ($data['plan']['details']['creditHistory'] as $history) {
                    if (isset($history['creditsBought'])) {
                        $totalcreditsbought += (int) $history['creditsBought'];
                    }
                }
            }

            self::log(null, 'Credit plan detected. Credits: ' . $credits . ', Total Credits Bought: ' . $totalcreditsbought);
            set_config('getplancredits', $credits, 'quizaccess_quizproctoring');
            set_config('getplantotalcredits', $totalcreditsbought, 'quizaccess_quizproctoring');
            set_config('getplanexpiry', 0, 'quizaccess_quizproctoring');

            if ($credits >= 0) {
                set_config('getplaninfo', 1, 'quizaccess_quizproctoring');
                set_config('getplanname', 'Credit Base Plan', 'quizaccess_quizproctoring');
            } else {
                set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                set_config('getplanname', '', 'quizaccess_quizproctoring');
            }
            return;
        }

        $expiretimestamp = null;
        if (isset($data['plan']['details']['expiryDate'])) {
            $expiretimestamp = (int) $data['plan']['details']['expiryDate'];
        } else if (isset($data['plan']['details']['expireDate'])) {
            $expiretimestamp = (int) $data['plan']['details']['current_end'];
        }

        set_config('getplancredits', 0, 'quizaccess_quizproctoring');
        set_config('getplantotalcredits', 0, 'quizaccess_quizproctoring');

        if ($expiretimestamp !== null) {
            $currenttimestamp = time();
            self::log(null, 'API data: ' . json_encode($data['plan']));
            set_config('getplanexpiry', $expiretimestamp, 'quizaccess_quizproctoring');
            if ($expiretimestamp < $currenttimestamp) {
                set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                set_config('getplanname', $data['plan']['planName'] ?? '', 'quizaccess_quizproctoring');
            } else {
                set_config('getplaninfo', 1, 'quizaccess_quizproctoring');
                if (!empty($data['plan']['planName'])) {
                    set_config('getplanname', $data['plan']['planName'], 'quizaccess_quizproctoring');
                }
            }
            return;
        }

        set_config('getplanexpiry', 0, 'quizaccess_quizproctoring');
        set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
        set_config('getplanname', '', 'quizaccess_quizproctoring');
    }

    /**
     * Timestamp of the last successful sync, or 0 when never synced.
     *
     * @return int
     */
    public static function get_last_sync_time(): int {
        return (int) get_config('quizaccess_quizproctoring', 'getplansynctime');
    }

    /**
     * @param callable|null $logger
     * @param string $message
     */
    private static function log(?callable $logger, string $message): void {
        if ($logger !== null) {
            $logger($message);
            return;
        }
        debugging($message, DEBUG_DEVELOPER);
    }
}
