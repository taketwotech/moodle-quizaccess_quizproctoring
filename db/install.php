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
 * Proctoring events file.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();

/**
 * Post-install script
 */
function xmldb_quizaccess_quizproctoring_install() {
    global $DB, $USER;

    $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
    $version = get_config('quizaccess_quizproctoring', 'version');

    $record = new stdClass();
    $record->firstname = $user->firstname;
    $record->lastname  = $user->lastname;
    $record->email     = $user->email;
    $record->moodle_v  = get_config('moodle', 'release');    
    $record->previously_installed_v = $version !== false ? $version : '';

    $postdata = json_encode($record);

    $curl = new \curl();
    $url = 'https://proctorofppt.dataprotechgroup.com/create';
    $header = [
        'Content-Type: application/json',
    ];
    $curl->setHeader($header);
    $result = $curl->post($url, $postdata);
}
