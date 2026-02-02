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
 * AJAX call to show proctor audios on review attempt page
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_login();

$attemptid = required_param('attemptid', PARAM_INT);
$page = optional_param('page', 1, PARAM_INT);
$perpage = optional_param('perpage', 20, PARAM_INT);

$sql = "SELECT * FROM {quizaccess_proctor_audio}
        WHERE attemptid = :attemptid AND deleted = 0
        ORDER BY id ASC";
$params = ['attemptid' => $attemptid];
$records = $DB->get_records_sql($sql, $params);

$totalcount = count($records);
$totalpages = ceil($totalcount / $perpage);
$startindex = ($page - 1) * $perpage;
$records = array_slice($records, $startindex, $perpage);
$audios = [];

foreach ($records as $record) {
    $audios[] = [
        'audiofile' => $CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/audiofile.php?file=' . urlencode($record->audioname),
        'timecreated' => userdate($record->timecreated, '%H:%M'),
    ];
}
echo json_encode([
    'audios' => $audios,
    'currentPage' => $page,
    'totalPages' => $totalpages,
]);
exit;
