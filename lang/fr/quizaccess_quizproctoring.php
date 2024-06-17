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
 * Strings for the quizaccess_quizproctoring plugin.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();


$string['pluginname'] = "Surveillance de la règle d'accès au quiz";
$string['privacy:metadata'] = "Le plug-in de règle d'accès au quiz Proctoring ne stocke aucune donnée personnelle.";
$string['requiresafeexambrowser'] = "Exiger l'utilisation du navigateur Safe Exam";
$string['proctoringerror'] = "Ce quiz a été configuré de manière à ce qu'il ne puisse être tenté qu'à l'aide de la surveillance.";
$string['proctoringnotice'] = "Ce quiz a été configuré de manière à ce que les étudiants ne puissent le tenter qu'en utilisant la surveillance.";
$string['enableproctoring'] = "Activer la surveillance avec ce quiz";
$string['enableproctoring_help'] = "Si vous l'activez, l'utilisateur doit vérifier son identité avant de commencer ce test";
$string['reqproctormsg'] = "Veuillez capturer votre image et télécharger une preuve d'identité";
$string['uploadidentity'] = "Veuillez télécharger une photo de votre pièce d'identité avec photo";
$string['takepicture'] = "Prendre une photo";
$string['retake'] = "Reprendre";
$string['useridentityerror'] = "Veuillez télécharger un fichier valide et capturer votre image";
$string['awskey'] = "Clé d'API AWS";
$string['awskey_help'] = "Entrez ici la clé d'API AWS à utiliser pour accéder aux services AWS";
$string['awssecret'] = "Clé secrète AWS";
$string['awssecret_help'] = "Entrez ici le secret AWS à utiliser pour accéder aux services AWS";
$string['help_timeinterval'] = "Sélectionner l'intervalle de temps pour la surveillance de l'image";
$string['proctoringtimeinterval'] = "Intervalle de temps";
$string['nofacedetected'] = 'Aucun visage détecté.{$a}';
$string['multifacesdetected'] = 'Plusieurs visages détectés. {$a}';
$string['facesnotmatched'] = 'Votre image actuelle est différente de l\'image initiale. {$a}';
$string['eyesnotopened'] = 'Ne couvrez pas vos yeux. {$a}';
$string['facemaskdetected'] = 'Ne couvrez pas votre visage. {$a}';
$string['demovideo'] = "Pour voir le processus complet, veuillez cliquer ici";
$string['selectanswer'] = "Veuillez sélectionner une réponse";
$string['clickpicture'] = "Veuillez prendre votre photo avant de commencer l'examen";
$string['warning_threshold'] = "Seuil d'avertissements Pendant l'examen surveillé";
$string['warning_threshold_help'] = "Nombre d'avertissements qu'un utilisateur doit recevoir avant d'être disqualifié de l'examen surveillé.";
$string['warningsleft'] = 'Il ne vous reste plus que {$a}.';
$string['orderlinesettings'] = "Paramètres liés à la ligne de commande";
$string['proctoring_videolink'] = "Lien vidéo de surveillance du quiz";
$string['proctoringlink'] = "Lien vidéo de surveillance";
$string['proctoringlink_help'] = "Veuillez ajouter un lien vidéo pour la vidéo de démonstration de la surveillance du quiz.";
$string['avertissement'] = ' avertissement';
$string['avertissements'] = ' avertissements';
$string['mainimage'] = 'Image principale';
$string['quizproctoring:quizproctoringreport'] = 'Afficher les images de surveillance et les boutons d\'identité de surveillance';
$string['noimageswarning'] = 'Aucun avertissement détecté';
$string['proctoringimages'] = 'Images de surveillance';
$string['proctoringidentity'] = 'Identité de surveillance';
$string['serviceoption'] = 'Option de service Facematch';
$string['serviceoption_desc'] = 'Service to match faces';
$string['accesstoken'] = 'Jeton d\'accès au serveur étendu';
$string['accesstoken_help'] = 'Jeton d\'accès généré à partir de l\'intégration du système Extenal Server';
$string['accesstokensecret'] = 'Secret du jeton d\'accès au serveur étendu';
$string['accesstokensecret_help'] = 'Secret d\'accès généré à partir de l\'intégration du système Extenal Server';
$string['proctoring_recording'] = 'Enregistrement de surveillance';
$string['proctoring_recording_help'] = 'Si cette option est définie, l\'enregistrement de surveillance est affiché lors d\'une tentative de révision.';
