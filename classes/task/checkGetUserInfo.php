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
        global $CFG;
        mtrace("Executing scheduled task: Check Get User Info");
        require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');
        quizaccess_quizproctoring_sync_plan_if_stale(true, function(string $message): void {
            mtrace($message);
        });
        return true;
    }
}
