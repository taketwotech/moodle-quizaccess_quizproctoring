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
 * AJAX call to show proctor identity on review attempt page
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_login();
$userid = required_param('userid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);

$url = '';
if ($proctoringimage = $DB->get_record("quizaccess_proctor_data", ['attemptid' => $attemptid,
    'userid' => $userid, 'quizid' => $quizid, 'image_status' => 'M'])) {
    $quizobj = \quiz::create($quizid, $userid);
    $context = $quizobj->get_context();
    $fs = get_file_storage();
    $files = $fs->get_area_files($context->id, 'quizaccess_quizproctoring', 'identity', $proctoringimage->id);
    foreach ($files as $file) {
        $filename = $file->get_filename();
        $url = moodle_url::make_file_url('/pluginfile.php',
            '/'.$file->get_contextid().'/quizaccess_quizproctoring/identity/'.$file->get_itemid().'/'.$filename);
    }

    if ($url) {
        $url = new moodle_url($url);
        echo json_encode(['success' => true, 'url' => $url->out()]);
    } else {
        echo json_encode(['success' => false, 'message' => get_string('noimages', 'quizaccess_quizproctoring')]);
    }
} else {
    echo json_encode(['success' => false, 'message' => get_string('noimages', 'quizaccess_quizproctoring')]);
}
