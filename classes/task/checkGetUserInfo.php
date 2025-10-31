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
        } catch (Exception $exception) {
            mtrace('Error in getuserinfo API: ' . $exception->getMessage());
        }
        return true;
    }
}
