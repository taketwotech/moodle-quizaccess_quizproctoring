(function () {
    let mediaRecorder;
    let audioChunks = [];
    let audioContext, analyser, source;
    let recordingStarted = false;
    let silenceTimer = null;
    let recordingMaxTimer = null;
    let recordingSaved = false;
    let isUploading = false;
    let isHandlingUpload = false;

    const dbName = 'audioRecordingsDB';
    const storeName = 'audioChunks';
    let db;

    function openDB() {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function (e) {
            db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { autoIncrement: true });
            }
        };
        request.onsuccess = function (e) {
            db = e.target.result;
            console.log('IndexedDB initialized');

            const isReviewOrSummaryPage = window.location.href.includes('/review.php') ||
                window.location.href.includes('/summary.php');
            if (isReviewOrSummaryPage) {
                checkAndUploadChunks(true);
            }
        };
        request.onerror = function (e) {
            console.error("IndexedDB error:", e.target.errorCode);
        };
    }
    openDB();

    function useraudiorecord(stream) {
        console.log('Audio monitoring started');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function detectAudioActivity() {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            let average = sum / bufferLength;

            if (average > 30) {
                if (!recordingStarted) {
                    console.log('Sound detected — starting recording');
                    startRecording(stream);
                } else {
                    if (silenceTimer) {
                        clearTimeout(silenceTimer);
                        silenceTimer = null;
                    }
                }
            } else if (recordingStarted && !silenceTimer) {
                silenceTimer = setTimeout(() => {
                    console.log('Silence detected — stopping recording');
                    stopRecording();
                }, 5000);
            }
        }

        setInterval(detectAudioActivity, 500);
    }

    function startRecording(stream) {
        const audioTracks = stream.getAudioTracks();
        const audioStream = new MediaStream(audioTracks);
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];
        recordingSaved = false;
        recordingStarted = true;

        mediaRecorder.ondataavailable = function (e) {
            if (e.data.size > 0) {
                audioChunks.push({
                    blob: e.data,
                    timestamp: Math.floor(Date.now() / 1000)
                });
            }
        };

        mediaRecorder.onstop = function () {
            if (!recordingSaved) {
                for (const chunk of audioChunks) {
                    saveToIndexedDB(chunk.blob, chunk.timestamp);
                }
                recordingSaved = true;
                audioChunks = [];
            }
            recordingStarted = false;
            silenceTimer = null;
            clearTimeout(recordingMaxTimer);
        };

        mediaRecorder.start();

        recordingMaxTimer = setTimeout(() => {
            console.log('Max duration reached — stopping recording');
            stopRecording();
        }, 60000);
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }

    function saveToIndexedDB(blob, timestamp) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.add({ blob, timestamp });

        transaction.oncomplete = () => {
            console.log('Audio chunk with timestamp saved to IndexedDB');
            checkAndUploadChunks();
        };

        transaction.onerror = (e) => {
            console.error('IndexedDB error:', e.target.error);
        };
    }

    function checkAndUploadChunks(forceUpload = false, keepAlive = false) {
        if (!db || isUploading) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = function () {
                const chunks = request.result;
                if (chunks.length >= 5 || (forceUpload && chunks.length > 0)) {
                    console.log(`Uploading ${chunks.length} chunks from IndexedDB`);
                    uploadMultipleBlobs(chunks, keepAlive)
                        .then(resolve)
                        .catch(reject);
                } else {
                    if (forceUpload && chunks.length === 0) {
                        console.log('No chunks to upload');
                    }
                    resolve();
                }
            };

            request.onerror = function() {
                reject(new Error('Failed to read from IndexedDB'));
            };
        });
    }

    function uploadMultipleBlobs(chunks, keepAlive = false) {
        if (isUploading || chunks.length === 0) return Promise.resolve();
        isUploading = true;
        
        const formData = new FormData();
        const attemptid = document.querySelector('input[name="attempt"]')?.value || '';
        const quizid = localStorage.getItem('quizid');
        const timestamps = [];

        chunks.forEach((chunk, index) => {
            formData.append(`audio${index}`, chunk.blob, `audio${index}.webm`);
            timestamps.push(chunk.timestamp);
        });

        formData.append("attemptid", attemptid);
        formData.append("quizid", quizid);
        formData.append("timestamps", JSON.stringify(timestamps));

        const uploadUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/upload_audio.php';

        // Use fetch with keepalive for beforeunload events (keeps request alive during page unload)
        return fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            keepalive: keepAlive // Keep request alive even if page unloads
        })
        .then(response => response.json())
        .then(result => {
            console.log('Uploaded chunks:', result);
            clearIndexedDB();
            isUploading = false;
            return result;
        })
        .catch(error => {
            console.error('Upload error:', error);
            isUploading = false;
            throw error;
        });
    }

    function clearIndexedDB() {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
        transaction.oncomplete = () => {
            console.log('IndexedDB cleared after upload');
        };
    }

    function handleImmediateUpload() {
        // Prevent multiple simultaneous calls
        if (isHandlingUpload) {
            console.log('Upload already in progress, skipping duplicate call...');
            return Promise.resolve();
        }
        
        isHandlingUpload = true;
        return new Promise((resolve) => {
            console.log('Navigation action detected — checking for chunks to upload');
            
            const finishUpload = () => {
                isHandlingUpload = false;
                resolve();
            };
            
            // Stop current recording if active
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.onstop = function () {
                    if (!recordingSaved) {
                        // Save chunks to IndexedDB synchronously
                        const savePromises = [];
                        for (const chunk of audioChunks) {
                            savePromises.push(new Promise((saveResolve) => {
                                const transaction = db.transaction([storeName], 'readwrite');
                                const store = transaction.objectStore(storeName);
                                const addRequest = store.add({ blob: chunk.blob, timestamp: chunk.timestamp });
                                addRequest.onsuccess = () => saveResolve();
                                addRequest.onerror = () => saveResolve(); // Continue even on error
                            }));
                        }
                        
                        Promise.all(savePromises).then(() => {
                            recordingSaved = true;
                            audioChunks = [];
                            // Wait a bit for IndexedDB to fully commit, then upload
                            setTimeout(() => {
                                checkAndUploadChunks(true, false)
                                    .then(finishUpload)
                                    .catch(() => finishUpload()); // Resolve anyway to allow navigation
                            }, 200);
                        });
                    } else {
                        checkAndUploadChunks(true, false)
                            .then(finishUpload)
                            .catch(() => finishUpload()); // Resolve anyway to allow navigation
                    }
                };
                mediaRecorder.stop();
            } else {
                // No active recording, just upload existing chunks
                checkAndUploadChunks(true, false)
                    .then(finishUpload)
                    .catch(() => finishUpload()); // Resolve anyway to allow navigation
            }
        });
    }

    window.useraudiorecord = useraudiorecord;

    // Store clicked button for form submission
    let clickedSubmitButton = null;

    // Listen for button clicks first to capture which button was clicked
    document.addEventListener('click', function(e) {
        const target = e.target;
        // Check if it's a submit button in a quiz form
        if ((target.tagName === 'INPUT' && target.type === 'submit') || 
            (target.tagName === 'BUTTON' && (target.type === 'submit' || !target.type))) {
            const form = target.closest('form');
            if (form && (
                form.id === 'responseform' ||
                form.classList.contains('quizform') ||
                form.querySelector('input[name="next"]') ||
                form.querySelector('input[name="previous"]') ||
                form.querySelector('input[name="back"]') ||
                form.querySelector('input[name="finishattempt"]')
            )) {
                // Store the clicked button
                clickedSubmitButton = target;
            }
        }
    }, true);

    // Listen for form submissions (quiz navigation)
    document.addEventListener('submit', function(e) {
        const form = e.target;
        
        // Skip if already handling upload or if this is a programmatic submit
        if (isHandlingUpload || form.dataset.programmaticSubmit === 'true') {
            return;
        }
        
        // Check if it's a quiz navigation form
        if (form.tagName === 'FORM' && (
            form.querySelector('input[name="next"]') ||
            form.querySelector('input[name="previous"]') ||
            form.querySelector('input[name="back"]') ||
            form.querySelector('input[name="finishattempt"]') ||
            form.querySelector('button[name="next"]') ||
            form.querySelector('button[name="previous"]') ||
            form.querySelector('button[name="back"]') ||
            form.querySelector('button[name="finishattempt"]') ||
            form.id === 'responseform' ||
            form.classList.contains('quizform')
        )) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Use the stored clicked button or try to find it
            const submitButton = clickedSubmitButton || e.submitter || 
                form.querySelector('input[type="submit"]:focus, button[type="submit"]:focus') ||
                form.querySelector('input[name="next"], input[name="previous"], input[name="back"], input[name="finishattempt"]') ||
                form.querySelector('button[name="next"], button[name="previous"], button[name="back"], button[name="finishattempt"]') ||
                form.querySelector('input[type="submit"], button[type="submit"]');
            
            // Store button info for later submission
            const buttonName = submitButton ? submitButton.name : '';
            const buttonValue = submitButton ? submitButton.value : '';
            
            // Clear the stored button
            clickedSubmitButton = null;
            
            // Disable button to prevent double-clicks (but don't change text)
            if (submitButton) {
                submitButton.disabled = true;
            }
            
            handleImmediateUpload().then(() => {
                // Re-enable button
                if (submitButton) {
                    submitButton.disabled = false;
                }
                // Mark as programmatic submit to prevent re-triggering
                form.dataset.programmaticSubmit = 'true';
                
                // Create a hidden input with the button's name/value to preserve the action
                if (buttonName) {
                    // Remove any existing hidden input with same name
                    const existing = form.querySelector(`input[type="hidden"][name="${buttonName}"]`);
                    if (existing) {
                        existing.remove();
                    }
                    
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = buttonName;
                    if (buttonValue) {
                        hiddenInput.value = buttonValue;
                    }
                    form.appendChild(hiddenInput);
                }
                
                // Submit the form after upload completes
                // Ensure hidden input is added and form is ready
                if (buttonName) {
                    // Double-check the hidden input exists
                    let hiddenInput = form.querySelector(`input[type="hidden"][name="${buttonName}"]`);
                    if (!hiddenInput) {
                        hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.name = buttonName;
                        if (buttonValue) {
                            hiddenInput.value = buttonValue;
                        }
                        form.appendChild(hiddenInput);
                    }
                }
                
                // Submit using the native form.submit() method
                // This bypasses the submit event, so our listener won't catch it
                setTimeout(() => {
                    HTMLFormElement.prototype.submit.call(form);
                }, 50);
            }).catch(() => {
                // Even if upload fails, allow navigation
                if (submitButton) {
                    submitButton.disabled = false;
                }
                form.dataset.programmaticSubmit = 'true';
                
                // Create a hidden input with the button's name/value to preserve the action
                if (buttonName) {
                    // Remove any existing hidden input with same name
                    const existing = form.querySelector(`input[type="hidden"][name="${buttonName}"]`);
                    if (existing) {
                        existing.remove();
                    }
                    
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = buttonName;
                    if (buttonValue) {
                        hiddenInput.value = buttonValue;
                    }
                    form.appendChild(hiddenInput);
                }
                
                // Ensure hidden input is added
                if (buttonName) {
                    let hiddenInput = form.querySelector(`input[type="hidden"][name="${buttonName}"]`);
                    if (!hiddenInput) {
                        hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.name = buttonName;
                        if (buttonValue) {
                            hiddenInput.value = buttonValue;
                        }
                        form.appendChild(hiddenInput);
                    }
                }
                
                setTimeout(() => {
                    HTMLFormElement.prototype.submit.call(form);
                }, 50);
            });
        }
    }, true); // Use capture phase to catch early

    // Listen for button clicks on navigation buttons (only for non-form buttons and links)
    document.addEventListener('click', function(e) {
        // Skip if already handling upload
        if (isHandlingUpload) {
            return;
        }
        
        const target = e.target;
        const buttonName = target.name || target.getAttribute('name') || '';
        const buttonValue = target.value || target.textContent || '';
        const buttonId = target.id || '';
        let isNavigationButton = false;
        
        // Check for navigation buttons that are NOT submit buttons (submit buttons will trigger form submit)
        if ((target.tagName === 'BUTTON' && target.type !== 'submit') || 
            (target.tagName === 'INPUT' && target.type !== 'submit')) {
            if (buttonName === 'next' || 
                buttonName === 'previous' || 
                buttonName === 'back' || 
                buttonName === 'finishattempt' ||
                buttonValue.toLowerCase().includes('next') ||
                buttonValue.toLowerCase().includes('previous') ||
                buttonValue.toLowerCase().includes('back') ||
                buttonValue.toLowerCase().includes('finish') ||
                buttonId.includes('next') ||
                buttonId.includes('previous') ||
                buttonId.includes('back') ||
                buttonId.includes('finish')) {
                isNavigationButton = true;
            }
        }
        
        // Check for links that might navigate
        if (target.tagName === 'A' && (
            target.href.includes('attempt.php') ||
            target.href.includes('summary.php') ||
            target.href.includes('review.php')
        )) {
            isNavigationButton = true;
        }
        
        if (isNavigationButton) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Disable button during upload
            if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
                target.disabled = true;
            }
            
            handleImmediateUpload().then(() => {
                // Re-enable and trigger navigation
                if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
                    target.disabled = false;
                    // Use a small delay to ensure upload completes
                    setTimeout(() => {
                        target.click();
                    }, 50);
                } else if (target.tagName === 'A') {
                    window.location.href = target.href;
                }
            }).catch(() => {
                // Even if upload fails, allow navigation
                if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
                    target.disabled = false;
                    setTimeout(() => {
                        target.click();
                    }, 50);
                } else if (target.tagName === 'A') {
                    window.location.href = target.href;
                }
            });
        }
    }, true); // Use capture phase

    // Listen for page reload - use sendBeacon for reliability
    window.addEventListener('beforeunload', function (e) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('Page is refreshing — stopping current recording and saving...');
            mediaRecorder.onstop = function () {
                if (!recordingSaved) {
                    // Save chunks synchronously
                    const savePromises = [];
                    for (const chunk of audioChunks) {
                        savePromises.push(new Promise((saveResolve) => {
                            const transaction = db.transaction([storeName], 'readwrite');
                            const store = transaction.objectStore(storeName);
                            const addRequest = store.add({ blob: chunk.blob, timestamp: chunk.timestamp });
                            addRequest.onsuccess = () => saveResolve();
                            addRequest.onerror = () => saveResolve();
                        }));
                    }
                    
                    Promise.all(savePromises).then(() => {
                        recordingSaved = true;
                        audioChunks = [];
                        setTimeout(() => {
                            checkAndUploadChunks(true, true); // Use keepalive
                        }, 100);
                    });
                } else {
                    checkAndUploadChunks(true, true); // Use keepalive
                }
            };
            mediaRecorder.stop();
        } else {
            // Even if not recording, upload any existing chunks using keepalive
            checkAndUploadChunks(true, true); // Use keepalive
        }
    });
})();