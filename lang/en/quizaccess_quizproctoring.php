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
 * Strings for the quizaccess_proctoring plugin.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage proctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();


$string['pluginname'] = 'Proctoring quiz access rule';
$string['privacy:metadata'] = 'The Proctoring quiz access rule plugin does not store any personal data.';
$string['requiresafeexambrowser'] = 'Require the use of Safe Exam Browser';
$string['proctoringerror'] = 'This quiz has been set up so that it may only be attempted using the Proctoring.';
$string['proctoringnotice'] = 'This quiz has been configured so that students may only attempt it using the Proctoring.';
$string['enableproctoring'] = 'Enable proctoring with this quiz';
$string['enableproctoring_help'] = 'If you enable it, user has to verify their identity before starting this test';
$string['reqproctormsg'] = 'Please capture your image and upload ID proof';
$string['uploadidentity'] = 'Please upload a picture of your Photo ID';
$string['takepicture'] = 'Take picture';
$string['retake'] = 'Retake';
$string['useridentityerror'] = 'Please upload a valid file and capture your picture';
$string['awskey'] = 'AWS API Key';
$string['awskey_help'] = 'Enter AWS API key here to be used to access AWS services';
$string['awssecret'] = 'AWS Secret Key';
$string['awssecret_help'] = 'Enter AWS Secret here to be used to access AWS services';
$string['help_timeinterval'] = 'Select time interval for image procotring';
$string['proctoringtimeinterval'] = 'Time interval';
$string['nofacedetected'] = 'No face detected. {$a}';
$string['multifacesdetected'] = 'More than one face detected. {$a}';
$string['facesnotmatched'] = 'Your current image is different from the initial image. {$a}';
$string['eyesnotopened'] = 'Do not cover your eyes. {$a}';
$string['facemaskdetected'] = 'Do not cover your face. {$a}';
$string['demovideo'] = 'To watch full process, please click here';
$string['selectanswer'] = 'Please select an answer';
$string['clickpicture'] = 'Please capture your picture before starting the exam';
$string['warning_threshold'] = 'Warnings Threshold During proctored exam';
$string['warning_threshold_help'] = 'Number of warnings a user should receive before the user gets disqualified from the proctored exam.';
$string['warningsleft'] = 'You have only {$a} left.';
$string['orderlinesettings'] = 'Orderline Related Settings';
$string['proctoring_videolink'] = "Quiz proctoring video link";
$string['proctoringlink'] = 'Proctoring video link';
$string['proctoringlink_help'] = "Please add video link for demovideo of quiz proctoring.";
$string['oneminute'] = '1 minute';
$string['fiveminutes'] = '5 minutes';
$string['tenminutes'] = '10 minutes';
$string['fiveseconds'] = '5 seconds';
$string['tenseconds'] = '10 seconds';
$string['fiftenseconds'] = '15 seconds';
$string['twentyseconds'] = '20 seconds';
$string['thirtyseconds'] = '30 seconds';
$string['twominutes'] = '2 minutes';
$string['threeminutes'] = '3 minutes';
$string['fourminutes'] = '4 minutes';
$string['fiftenminutes'] = '15 minutes';
$string['warning'] = ' warning';
$string['warnings'] = ' warnings';
$string['proctoring_image_show'] = 'Proctoring Image Show';
$string['proctoring_image_show_help'] = 'If set, Proctoring Image Show in review attempt.';
$string['mainimage'] = 'Main Image';
$string['warningaws'] = 'Please complete <a href="{$a}">AWS configuration</a> to continue with quiz.';
$string['warningopensourse'] = 'Please complete <a href="{$a}">configuration</a> to continue with quiz.';
$string['warningstudent'] = 'The quiz is not properly configured. Please contact site administrator.';
$string['quizproctoring:quizproctoringreport'] = 'View Proctoring Images and Proctoring Identity buttons';
$string['noimages'] = 'No images';
$string['noimageswarning'] = 'No Warnings Detected';
$string['proctoringimages'] = 'Proctoring Images';
$string['proctoringidentity'] = 'Proctoring Identity';
$string['viewstudentonline'] = 'View Online Student';
$string['quizproctoring:quizproctoringonlinestudent'] = 'View Online Students during Proctoring';
$string['externalserver'] = 'Extenal Server';
$string['externalserver_help'] = 'Enter Extenal Server endpoint here to be used for Proctoring services';
$string['novideo'] = 'No Videos';
$string['serviceoption'] = 'Facematch Service Option';
$string['serviceoption_desc'] = 'Service to match faces';
$string['accesstoken'] = 'Extenal Server Token';
$string['accesstoken_help'] = 'Access token generated from Extenal Server System Integration';
$string['accesstokensecret'] = 'Extenal Server Secret Token';
$string['accesstokensecret_help'] = 'Access secret generated from Extenal Server System Integration';
$string['enableteacherproctor'] = 'Enable proctoring for Teacher with this quiz';
$string['enableteacherproctor_help'] = 'If you enable it, Teacher should be able to see group of users attempting proctored quiz';
