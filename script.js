document.addEventListener("DOMContentLoaded", () => {

    // ── 1. AOS — Animate on Scroll ──────────────────────────────────
    AOS.init({ duration: 900, once: true, offset: 60, easing: 'ease-out-cubic' });

    // ── 2. Dark Mode ────────────────────────────────────────────────
    const html = document.documentElement;
    const darkToggle = document.getElementById('dark-toggle');
    const darkIcon = document.getElementById('dark-icon');

    // Load saved preference
    if (localStorage.getItem('darkMode') === 'true') {
        html.classList.add('dark');
        if (darkIcon) darkIcon.className = 'fa-solid fa-sun text-yellow-400 text-lg';
    }

    if (darkToggle) {
        darkToggle.addEventListener('click', () => {
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('darkMode', isDark);
            if (darkIcon) {
                darkIcon.className = isDark
                    ? 'fa-solid fa-sun text-yellow-400 text-lg'
                    : 'fa-solid fa-moon text-primary text-lg';
            }
        });
    }

    // ── 3. Countdown Timer ──────────────────────────────────────────
    const targetDate = new Date("December 20, 2026 08:00:00").getTime();

    const countdownInterval = setInterval(function () {
        const now = new Date().getTime();
        const distance = targetDate - now;
        const el = (id) => document.getElementById(id);

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (el('days')) el('days').innerText = days.toString().padStart(2, '0');
        if (el('hours')) el('hours').innerText = hours.toString().padStart(2, '0');
        if (el('minutes')) el('minutes').innerText = minutes.toString().padStart(2, '0');
        if (el('seconds')) el('seconds').innerText = seconds.toString().padStart(2, '0');

        if (distance < 0) {
            clearInterval(countdownInterval);
            const cd = document.getElementById("countdown");
            if (cd) cd.innerHTML = "<div class='col-span-4 text-center py-4 text-lg font-serif'>Acara Sedang Berlangsung 🎉</div>";
        }
    }, 1000);

    // ── 4. RSVP Form — Google Sheets via Hidden Form Submission ─────
    // Method: iframe form submit — no CORS restriction, 100% reliable
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxrGf1p3vM2gOXJ2rCogSuNgLI4Fap97fPbhwt6JHmMKQBwwRSJAFg72FyhbXlIjyXh/exec';

    const rsvpForm = document.getElementById('rsvp-form');
    const alertMsg = document.getElementById('alert-message');
    const submitBtn = rsvpForm ? rsvpForm.querySelector('button[type="submit"]') : null;
    const submitOrig = submitBtn ? submitBtn.innerHTML : '';

    function submitToSheets(data) {
        return new Promise((resolve) => {
            // Create hidden iframe (prevents page navigation)
            const iframe = document.createElement('iframe');
            iframe.name = '_gs_hidden_' + Date.now();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            // Create form targeting the iframe
            const form = document.createElement('form');
            form.method = 'POST'; // Changed to POST for reliability and larger payloads
            form.action = GOOGLE_SCRIPT_URL;
            form.target = iframe.name;

            // Append all fields
            Object.entries(data).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);

            // Cleanup after submit
            iframe.addEventListener('load', () => {
                setTimeout(() => {
                    document.body.removeChild(form);
                    document.body.removeChild(iframe);
                }, 2000);
                resolve('success');
            });

            form.submit();

            // Safety timeout if iframe.onload doesn't fire
            setTimeout(() => resolve('timeout'), 8000);
        });
    }

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const attendance = document.getElementById('attendance').value;
            const guests = document.getElementById('guests').value;
            const message = document.getElementById('message').value.trim();

            if (!name || !attendance) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Mengirim...';

            try {
                await submitToSheets({
                    name, attendance, guests, message,
                    timestamp: new Date().toLocaleString('id-ID')
                });

                if (alertMsg) {
                    alertMsg.classList.remove('hidden');
                    alertMsg.querySelector('p').textContent = `Terima kasih ${name}! Konfirmasi Anda telah kami terima. 🎉`;
                }
                rsvpForm.reset();

            } catch (err) {
                if (alertMsg) {
                    alertMsg.classList.remove('hidden');
                    alertMsg.querySelector('p').textContent = 'Gagal mengirim. Coba lagi.';
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitOrig;
                setTimeout(() => { if (alertMsg) alertMsg.classList.add('hidden'); }, 6000);
            }
        });
    }

    // ── 5. Background Music Toggle ──────────────────────────────────
    const bgMusic = document.getElementById('bg-music');
    const musicToggleBtn = document.getElementById('music-toggle');
    const musicIcon = document.getElementById('music-icon');
    let isPlaying = false;

    if (musicToggleBtn && bgMusic && musicIcon) {
        musicToggleBtn.addEventListener('click', () => {
            if (isPlaying) {
                bgMusic.pause();
                musicIcon.classList.remove('fa-spin');
            } else {
                bgMusic.play().catch(e => console.log("Audio blocked:", e));
                musicIcon.classList.add('fa-spin');
            }
            isPlaying = !isPlaying;
        });
    }

    // ── 6. Live Floating Wishes (Komentar Melayang) ─────────────────
    const wishesContainer = document.getElementById('floating-wishes-container');
    const wishesView = document.getElementById('wishes-view');
    const btnViewWishes = document.getElementById('btn-view-wishes');
    const closeWishesView = document.getElementById('close-wishes-view');
    const wishesLoading = document.getElementById('wishes-loading');

    let activeWishesInterval = null;
    let fetchedWishes = [];
    let currentWishIndex = 0;

    async function fetchWishes() {
        try {
            // Kita panggil url yang sama dengan penambahan action=getWishes
            const response = await fetch(GOOGLE_SCRIPT_URL + '?action=getWishes');
            const result = await response.json();

            if (result.status === 'success' && result.data && result.data.length > 0) {
                fetchedWishes = result.data;
            } else {
                fetchedWishes = [];
            }
        } catch (e) {
            console.error("Gagal memuat pesan", e);
            fetchedWishes = [];
        }

        wishesLoading.classList.add('hidden');

        if (fetchedWishes.length === 0) {
            wishesContainer.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-white/50 text-xl font-handwriting">Belum ada ucapan. Jadilah yang pertama!</div>';
        } else {
            // Start floating animation
            currentWishIndex = 0;
            activeWishesInterval = setInterval(createWishBubble, 2500);
            createWishBubble(); // first trigger
        }
    }

    function createWishBubble() {
        if (!wishesContainer || fetchedWishes.length === 0) return;

        const wish = fetchedWishes[currentWishIndex];
        currentWishIndex++;
        if (currentWishIndex >= fetchedWishes.length) {
            currentWishIndex = 0;
        }

        // Wrapper element for vertical float Up animation
        const wrapper = document.createElement('div');
        wrapper.className = "float-wish absolute pointer-events-none";
        
        // Random horizontal position (10% to 80%)
        const leftPos = 10 + Math.random() * 70;
        wrapper.style.left = leftPos + '%';
        
        // Durasi terbang dan siklus hidup (lifespan) setiap bubble diatur ketat tepat selama 6 detik
        wrapper.style.animationDuration = '6s';
        
        // Kecepatan delay animasi acak tipis-tipis
        const delay = Math.random() * 1.0;
        wrapper.style.animationDelay = `${delay}s`;

        // Element Inner untuk animasi sway dan text
        const inner = document.createElement('div');

        // Menentukan ukuran tetesan air berdasarkan panjang teks agar menyesuaikan secara natural
        const textContent = wish.text || '';
        const textLength = String(textContent).length;
        let bubbleSize = 'w-32'; // Lebih kecil dari sebelumnya
        if (textLength < 20) bubbleSize = 'w-24';
        else if (textLength < 40) bubbleSize = 'w-28';
        else if (textLength < 60) bubbleSize = 'w-32';
        else bubbleSize = 'w-36';
        
        // Element Inner untuk animasi sway
        // Menggunakan aspect-square agar bentuk tetesan air (teardrop CSS) proporsional
        inner.className = `float-wish-inner flex flex-col justify-center items-center p-3 text-center transition-colors duration-300 relative water-drop-shine aspect-square ${bubbleSize} mx-auto`;
        
        // Bentuk gelembung ditaruh di elemen absolut terpisah agar transform rotate-nya tidak memutar teks
        inner.innerHTML = `
            <div class="water-drop-shape"></div>
            <i class="fa-solid fa-heart text-primary mb-1 text-[10px] drop-shadow-sm z-10 relative"></i>
            <h5 class="font-bold text-[11px] text-dark dark:text-gray-200 z-10 relative px-1 truncate w-full">${wish.name}</h5>
            <p class="text-[9px] text-gray-700 dark:text-gray-300 mt-0.5 leading-tight line-clamp-4 z-10 relative px-2 font-medium">"${wish.text}"</p>
        `;
        
        wrapper.appendChild(inner);
        wishesContainer.appendChild(wrapper);

        // Hapus total tepat pada detik ke-6 (6000ms) + delay
        setTimeout(() => {
            if (wrapper.parentNode) wrapper.remove();
        }, 6000 + (delay * 1000));
    }

    if (btnViewWishes && wishesView) {
        btnViewWishes.addEventListener('click', () => {
            // Tampilkan view
            wishesView.classList.remove('hidden');
            wishesView.classList.add('flex');
            // Sedikit delay agar transisi opacity jalan
            setTimeout(() => {
                wishesView.classList.remove('opacity-0');
            }, 50);

            // Tampilkan loading dan reset konten
            wishesLoading.classList.remove('hidden');
            wishesContainer.innerHTML = '';

            // Ambil data dari server (hanya data asli)
            fetchWishes();
        });

        closeWishesView.addEventListener('click', () => {
            wishesView.classList.add('opacity-0');
            setTimeout(() => {
                wishesView.classList.add('hidden');
                wishesView.classList.remove('flex');
                wishesContainer.innerHTML = ''; // bersihkan dom
                if (activeWishesInterval) {
                    clearInterval(activeWishesInterval);
                }
            }, 500); // durasi transisi
        });
    }

    // ── 7. Mini Game Pembuka Peta (Trivia Gamifikasi) ───────────────
    const lockBtns = document.querySelectorAll('.lock-map-btn');
    const realMapBtns = document.querySelectorAll('.real-map-btn');
    const triviaModal = document.getElementById('trivia-modal');
    const closeTriviaBtn = document.getElementById('close-trivia');
    const triviaQuestionEl = document.getElementById('trivia-question');
    const triviaOptionsEl = document.getElementById('trivia-options');
    const triviaCard = document.getElementById('trivia-card');

    const triviaData = [
        {
            question: "Di bulan dan tahun berapakah Zaed & Hindun pertama kali bertemu?",
            options: ["Januari 2022", "Maret 2022", "Juli 2025"],
            answer: 0
        },
        {
            question: "Kapan tanggal acara resepsi pernikahan dilaksanakan?",
            options: ["10 Desember 2026", "20 Desember 2026", "25 Desember 2026"],
            answer: 1
        }
    ];

    let currentQuestionIndex = 0;

    function renderQuestion() {
        if (currentQuestionIndex >= triviaData.length) {
            // Pemain menang (Semua benar)
            // Tampilkan popup sukses sementara
            triviaQuestionEl.innerHTML = '<span class="text-green-500 font-bold block mb-2"><i class="fa-solid fa-check-circle text-4xl mb-2"></i><br>Berhasil!</span>Peta lokasi telah dibuka.';
            triviaOptionsEl.innerHTML = '';

            setTimeout(() => {
                triviaModal.classList.add('hidden');
                lockBtns.forEach(btn => btn.classList.add('hidden'));
                realMapBtns.forEach(btn => btn.classList.remove('hidden'));
            }, 2000);
            return;
        }

        const q = triviaData[currentQuestionIndex];
        triviaQuestionEl.textContent = q.question;
        triviaOptionsEl.innerHTML = '';

        q.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = "trivia-btn w-full py-3 px-4 bg-secondary/50 hover:bg-primary hover:text-white dark:bg-gray-700 dark:hover:bg-primary dark:text-gray-200 rounded-xl text-sm font-medium transition-all duration-300 transform";
            btn.textContent = opt;
            btn.onclick = (e) => handleAnswer(index, e.target);
            triviaOptionsEl.appendChild(btn);
        });
    }

    function handleAnswer(selectedIndex, btnElement) {
        // Nonaktifkan semua tombol sementara animasi jalan
        const allBtns = triviaOptionsEl.querySelectorAll('.trivia-btn');
        allBtns.forEach(b => b.style.pointerEvents = 'none');

        if (selectedIndex === triviaData[currentQuestionIndex].answer) {
            // BENAR -> Warna Hijau
            btnElement.classList.remove('bg-secondary/50', 'dark:bg-gray-700', 'hover:bg-primary');
            btnElement.classList.add('bg-green-500', 'text-white', 'scale-105', 'shadow-lg');

            setTimeout(() => {
                currentQuestionIndex++;
                renderQuestion();
            }, 800);
        } else {
            // SALAH -> Warna Merah + Getar + Alert Text
            btnElement.classList.remove('bg-secondary/50', 'dark:bg-gray-700', 'hover:bg-primary');
            btnElement.classList.add('bg-red-500', 'text-white');

            // Animasi shake
            if (triviaCard) triviaCard.classList.add('animate-shake');

            // Tampilkan alert error
            let errorMsg = document.getElementById('trivia-error');
            if (!errorMsg) {
                errorMsg = document.createElement('p');
                errorMsg.id = 'trivia-error';
                errorMsg.className = 'text-red-500 text-sm mt-4 font-bold transition-opacity duration-300';
                triviaOptionsEl.parentElement.appendChild(errorMsg);
            }
            errorMsg.textContent = "Jawaban Salah, Coba Lagi!";
            errorMsg.style.opacity = '1';

            setTimeout(() => {
                // Reset styling
                btnElement.classList.remove('bg-red-500', 'text-white');
                btnElement.classList.add('bg-secondary/50', 'dark:bg-gray-700', 'hover:bg-primary');
                if (triviaCard) triviaCard.classList.remove('animate-shake');

                if (errorMsg) errorMsg.style.opacity = '0';

                // Aktifkan tombol lagi
                allBtns.forEach(b => b.style.pointerEvents = 'auto');
            }, 1000);
        }
    }

    if (triviaModal) {
        lockBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                currentQuestionIndex = 0; // Reset ke pertanyaan pertama
                let errorMsg = document.getElementById('trivia-error');
                if (errorMsg) errorMsg.remove();
                renderQuestion();
                triviaModal.classList.remove('hidden');
            });
        });

        closeTriviaBtn.addEventListener('click', () => {
            triviaModal.classList.add('hidden');
        });
    }

});
