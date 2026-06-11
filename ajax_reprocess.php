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
 * AJAX endpoint to reprocess pending proctoring images.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

require_login();
require_sesskey();

$cmid = required_param('cmid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);

$context = context_module::instance($cmid);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

\core_php_time_limit::raise(300);

$results = quizaccess_quizproctoring_reprocess_pending_images($quizid);
$remaining = quizaccess_quizproctoring_count_pending_images($quizid);

$message = get_string('reprocessresult', 'quizaccess_quizproctoring', (object) [
    'processed' => $results['processed'],
    'pending' => $results['pending'],
    'failed' => $results['failed'],
    'remaining' => $remaining,
]);
if ($results['processed'] === 0 && $remaining > 0) {
    $message .= ' ' . get_string('reprocessapinotavailable', 'quizaccess_quizproctoring');
}

@header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'processed' => $results['processed'],
    'pending' => $results['pending'],
    'failed' => $results['failed'],
    'remaining' => $remaining,
    'message' => $message,
]);
die();
