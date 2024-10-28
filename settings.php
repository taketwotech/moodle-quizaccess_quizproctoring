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
 * Settings file for quizaccess proctoring
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig && !empty($USER->id)) {

    // Mangeto Mapping Settings.
    $settings = new admin_settingpage('modsettingsquizcatproctoring',
        get_string('pluginname', 'quizaccess_quizproctoring'), 'moodle/site:config');

    $choices = [
        'take2' => 'Take2 Proctoring',
        'AWS' => 'AWS',
    ];
    $settings->add(new admin_setting_configselect('quizaccess_quizproctoring/serviceoption',
        get_string('serviceoption', 'quizaccess_quizproctoring'),
        get_string('serviceoption_desc', 'quizaccess_quizproctoring'),
        'take2',
        $choices
    ));

    $settings->add(new admin_setting_configtext('quizaccess_quizproctoring/aws_key',
        get_string('awskey', 'quizaccess_quizproctoring'),
        get_string('awskey_help', 'quizaccess_quizproctoring'),
        '',
        PARAM_TEXT));

    $settings->add(new admin_setting_configtext('quizaccess_quizproctoring/aws_secret',
        get_string('awssecret', 'quizaccess_quizproctoring'),
        get_string('awssecret_help', 'quizaccess_quizproctoring'),
        '',
        PARAM_TEXT));

    $settings->add(new admin_setting_configtext('quizaccess_quizproctoring/accesstoken',
        get_string('accesstoken', 'quizaccess_quizproctoring'),
        get_string('accesstoken_help', 'quizaccess_quizproctoring'),
                PARAM_TEXT));

    $settings->add(new admin_setting_configtext('quizaccess_quizproctoring/accesstokensecret',
        get_string('accesstokensecret', 'quizaccess_quizproctoring'),
        get_string('accesstokensecret_help', 'quizaccess_quizproctoring'),
        PARAM_TEXT));

    $settings->hide_if('quizaccess_quizproctoring/end_point', 'quizaccess_quizproctoring/serviceoption',
                'eq', 'AWS');

    $settings->hide_if('quizaccess_quizproctoring/accesstoken', 'quizaccess_quizproctoring/serviceoption',
                'eq', 'AWS');

    $settings->hide_if('quizaccess_quizproctoring/accesstokensecret', 'quizaccess_quizproctoring/serviceoption',
                'eq', 'AWS');

    $settings->hide_if('quizaccess_quizproctoring/aws_key', 'quizaccess_quizproctoring/serviceoption',
                'neq', 'AWS');

    $settings->hide_if('quizaccess_quizproctoring/aws_secret', 'quizaccess_quizproctoring/serviceoption',
                'neq', 'AWS');

    $settings->add(new admin_setting_configselect('quizaccess_quizproctoring/img_check_time',
        get_string('proctoringtimeinterval', 'quizaccess_quizproctoring'),
        get_string('help_timeinterval', 'quizaccess_quizproctoring'), 30,
        [
            5 => get_string('fiveseconds', 'quizaccess_quizproctoring'),
            30 => get_string('thirtyseconds', 'quizaccess_quizproctoring'),
            60 => get_string('oneminute', 'quizaccess_quizproctoring'),
            300 => get_string('fiveminutes', 'quizaccess_quizproctoring'),
        ]
    ));

    $settings->add(new admin_setting_configcheckbox('quizaccess_quizproctoring/proctoring_image_show',
        get_string('proctoring_image_show', 'quizaccess_quizproctoring'),
        get_string('proctoring_image_show_help', 'quizaccess_quizproctoring'), 1));
}
