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
 * Adhoc task to send warning threshold emails to course teachers.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_quizproctoring\task;

defined('MOODLE_INTERNAL') || die();

use core\task\adhoc_task;

/**
 * Adhoc task that sends a notification email when the warning email
 * threshold is reached for a student's quiz attempt.
 */
class warning_email_task extends adhoc_task {
    /**
     * Execute the task.
     */
    public function execute() {
        global $DB, $CFG;

        $data = $this->get_custom_data();
        if (empty($data) ||
            empty($data->courseid) ||
            empty($data->cmid) ||
            empty($data->quizid) ||
            empty($data->userid) ||
            empty($data->attemptid)) {
            // Nothing to do if required context is missing.
            return;
        }

        require_once($CFG->libdir . '/moodlelib.php');
        require_once($CFG->dirroot . '/course/lib.php');
        require_once($CFG->dirroot . '/mod/quiz/locallib.php');

        $course = $DB->get_record('course', ['id' => $data->courseid]);
        $quiz = $DB->get_record('quiz', ['id' => $data->quizid]);
        $student = $DB->get_record('user', ['id' => $data->userid], '*', IGNORE_MISSING);

        if (!$course || !$quiz || !$student) {
            return;
        }

        $cm = get_coursemodule_from_id('quiz', $data->cmid, $course->id, false, IGNORE_MISSING);
        if (!$cm) {
            return;
        }

        $context = \context_course::instance($course->id);

        // Determine which role receives the email: quiz setting or site default; 0 = course teachers.
        $proctoring = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $data->quizid]);
        $roleid = 0;
        if ($proctoring && isset($proctoring->warning_email_trigger_role) && (int)$proctoring->warning_email_trigger_role > 0) {
            $roleid = (int)$proctoring->warning_email_trigger_role;
        } else {
            $roleid = (int)get_config('quizaccess_quizproctoring', 'warning_email_trigger_role');
        }

        if ($roleid > 0) {
            $teachers = get_role_users($roleid, $context);
        } else {
            $teachers = get_enrolled_users($context, 'mod/quiz:grade');
        }
        if (empty($teachers)) {
            return;
        }

        // Link to the proctoring review attempts page for this user/quiz.
        $attempturl = new \moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php', [
            'userid' => $data->userid,
            'cmid' => $data->cmid,
            'quizid' => $data->quizid,
        ]);

        $a = new \stdClass();
        $a->coursename = format_string($course->fullname, true, ['context' => $context]);
        $a->quizname = format_string($quiz->name, true);
        $a->studentname = fullname($student);
        $a->warningcount = isset($data->warningcount) ? (int)$data->warningcount : 0;
        $a->attempturl = $attempturl->out(false);

        $fromuser = \core_user::get_support_user();
        $stringmanager = get_string_manager();

        foreach ($teachers as $teacher) {
            // Respect each recipient's language preference.
            $lang = !empty($teacher->lang) ? $teacher->lang : (!empty($course->lang) ? $course->lang : $CFG->lang);
            $subject = $stringmanager->get_string('warning_email_subject', 'quizaccess_quizproctoring', $a, $lang);
            $body = $stringmanager->get_string('warning_email_body', 'quizaccess_quizproctoring', $a, $lang);

            // Send a plain-text email to each recipient in their preferred language.
            email_to_user($teacher, $fromuser, $subject, $body);
        }
    }
}

