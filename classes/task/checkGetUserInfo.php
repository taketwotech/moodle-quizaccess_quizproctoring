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
 * Scheduled task for Clean Stored Images
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace quizaccess_quizproctoring\task;

use core\task\scheduled_task;
use Exception;

/**
 * Scheduled task for Clean Stored Images
 *
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class checkGetUserInfo extends scheduled_task {
    /**
     * Task Name
     *
     * @return string
     */
    public function get_name() {
        return get_string('checkgetuserinfo', 'quizaccess_quizproctoring');
    }

    /**
     * Execute Task.
     *
     * @return boolean
     */
    public function execute() {
        global $DB, $CFG;
        mtrace("Executing scheduled task: Check Get User Info");
        require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');
        try {
            $response = \quizaccess_quizproctoring\api::getuserinfo();
            $responsedata = json_decode($response, true);
            if (is_array($responsedata) && array_key_exists('active', $responsedata)) {
                $status = $responsedata['active'] ? 1 : 0;
                set_config('getuserinfo', $status, 'quizaccess_quizproctoring');
                mtrace("User info status updated: " . $status);
            } else {
                mtrace("Invalid response structure from getuserinfo API.");
            }

            $planresponse = \quizaccess_quizproctoring\api::getplaninfo();
            if (!empty($planresponse)) {
                $data = json_decode($planresponse, true);
                $plantype = isset($data['plan']['planType']) ? $data['plan']['planType'] : '';

                // Set empty flag based on whether plantype is not empty.
                if (!empty($plantype)) {
                    set_config('getplanresponseempty', 0, 'quizaccess_quizproctoring');
                } else {
                    set_config('getplanresponseempty', 1, 'quizaccess_quizproctoring');
                }

                // Handle credit-based plan type.
                if ($plantype === 'credit') {
                    $credits = isset($data['plan']['details']['credits']) ? (int)$data['plan']['details']['credits'] : 0;

                    // Get total credits bought from creditHistory.
                    $totalcreditsbought = 0;
                    if (isset($data['plan']['details']['creditHistory']) && is_array($data['plan']['details']['creditHistory'])) {
                        // Sum all creditsBought from creditHistory.
                        foreach ($data['plan']['details']['creditHistory'] as $history) {
                            if (isset($history['creditsBought'])) {
                                $totalcreditsbought += (int)$history['creditsBought'];
                            }
                        }
                    }

                    mtrace('Credit plan detected. Credits: ' . $credits . ', Total Credits Bought: ' . $totalcreditsbought);
                    set_config('getplancredits', $credits, 'quizaccess_quizproctoring');
                    set_config('getplantotalcredits', $totalcreditsbought, 'quizaccess_quizproctoring');
                    set_config('getplanexpiry', 0, 'quizaccess_quizproctoring'); // Clear expiry for credit plans.

                    if ($credits >= 0) {
                        set_config('getplaninfo', 1, 'quizaccess_quizproctoring');
                        set_config('getplanname', 'Credit Base Plan', 'quizaccess_quizproctoring');
                    } else {
                        set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                        set_config('getplanname', '', 'quizaccess_quizproctoring');
                    }
                } else {
                    // Handle different field names: expiryDate (free plan) or expireDate (subscription plan).
                    $expiretimestamp = null;
                    if (isset($data['plan']['details']['expiryDate'])) {
                        // Free plan uses 'expiryDate'.
                        $expiretimestamp = (int)$data['plan']['details']['expiryDate'];
                    } else if (isset($data['plan']['details']['expireDate'])) {
                        // Subscription plan uses 'expireDate'.
                        $expiretimestamp = (int)$data['plan']['details']['current_end'];
                    }

                    // Clear credits for non-credit plans.
                    set_config('getplancredits', 0, 'quizaccess_quizproctoring');
                    set_config('getplantotalcredits', 0, 'quizaccess_quizproctoring');

                    if ($expiretimestamp !== null) {
                        $currenttimestamp = time();
                        mtrace('API data: ' . json_encode($data['plan']));
                        set_config('getplanexpiry', $expiretimestamp, 'quizaccess_quizproctoring');
                        if ($expiretimestamp < $currenttimestamp) {
                            set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                            set_config('getplanname', $data['plan']['planName'], 'quizaccess_quizproctoring');
                        } else {
                            set_config('getplaninfo', 1, 'quizaccess_quizproctoring');

                            if (!empty($data['plan']['planName'])) {
                                set_config('getplanname', $data['plan']['planName'], 'quizaccess_quizproctoring');
                            }
                        }
                    } else {
                        set_config('getplanexpiry', 0, 'quizaccess_quizproctoring');
                        set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                        set_config('getplanname', '', 'quizaccess_quizproctoring');
                    }
                }
            } else {
                // Plan response is empty, set empty flag to 1.
                set_config('getplanresponseempty', 1, 'quizaccess_quizproctoring');
                set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                set_config('getplanname', '', 'quizaccess_quizproctoring');
            }
        } catch (Exception $exception) {
            mtrace('Error in API: ' . $exception->getMessage());
        }
        return true;
    }
}
