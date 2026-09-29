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
 * Map quiz classes that moved into namespaces in Moodle 4.2.
 *
 * Moodle 4.0 and 4.1 define quiz_attempt in mod/quiz/attemptlib.php.
 * Moodle 4.2+ autoloads mod_quiz\quiz_attempt.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if (!class_exists('mod_quiz\\quiz_attempt')) {
    if (!class_exists('quiz_attempt', false)) {
        global $CFG;
        require_once($CFG->dirroot . '/mod/quiz/attemptlib.php');
    }
    if (class_exists('quiz_attempt', false) && !class_exists('mod_quiz\\quiz_attempt', false)) {
        class_alias('quiz_attempt', 'mod_quiz\\quiz_attempt');
    }
}
