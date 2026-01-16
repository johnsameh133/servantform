document.addEventListener('DOMContentLoaded', () => {
    const placeSelect = document.getElementById('place');
    const govSelect = document.getElementById('governorate');
    const adminSelect = document.getElementById('administration');
    const schoolSelect = document.getElementById('school');
    const form = document.getElementById('teacherForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMessage = document.getElementById('status-message');

    // 1. Fetch Initial Data (Places and Governorates)
    fetch('/api/places')
        .then(res => res.json())
        .then(places => {
            places.forEach(place => {
                const option = document.createElement('option');
                option.value = place;
                option.textContent = place;
                placeSelect.appendChild(option);
            });
        })
        .catch(err => console.error('Error fetching places:', err));

    fetch('/api/governorates')
        .then(res => res.json())
        .then(govs => {
            govs.forEach(gov => {
                const option = document.createElement('option');
                option.value = gov;
                option.textContent = gov;
                govSelect.appendChild(option);
            });
        })
        .catch(err => console.error('Error fetching governorates:', err));

    // 2. Handle Governorate Change
    govSelect.addEventListener('change', () => {
        const selectedGov = govSelect.value;

        // Reset dependent dropdowns
        adminSelect.innerHTML = '<option value="">اختر الإدارة...</option>';
        adminSelect.disabled = true;
        schoolSelect.innerHTML = '<option value="">اختر المدرسة أولاً...</option>';
        schoolSelect.disabled = true;

        if (selectedGov) {
            // Fetch Administrations
            fetch(`/api/administrations/${encodeURIComponent(selectedGov)}`)
                .then(res => res.json())
                .then(admins => {
                    admins.forEach(admin => {
                        const option = document.createElement('option');
                        option.value = admin;
                        option.textContent = admin;
                        adminSelect.appendChild(option);
                    });
                    adminSelect.disabled = false;
                })
                .catch(err => console.error('Error fetching administrations:', err));
        }
    });

    // 3. Handle Administration Change
    adminSelect.addEventListener('change', () => {
        const selectedGov = govSelect.value;
        const selectedAdmin = adminSelect.value;

        // Reset dependent dropdown
        schoolSelect.innerHTML = '<option value="">اختر المدرسة...</option>';
        schoolSelect.disabled = true;

        if (selectedGov && selectedAdmin) {
            // Fetch Schools
            fetch(`/api/schools/${encodeURIComponent(selectedGov)}/${encodeURIComponent(selectedAdmin)}`)
                .then(res => res.json())
                .then(schools => {
                    schools.forEach(school => {
                        const option = document.createElement('option');
                        option.value = school;
                        option.textContent = school;
                        schoolSelect.appendChild(option);
                    });
                    schoolSelect.disabled = false;
                })
                .catch(err => console.error('Error fetching schools:', err));
        }
    });

    // 4. Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // status clear
        statusMessage.style.display = 'none';
        statusMessage.className = 'alert';
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        // Validation (File size)
        const photoInput = document.getElementById('idPhoto');
        if (photoInput.files.length > 0) {
            const fileSize = photoInput.files[0].size / 1024 / 1024; // in MB
            if (fileSize > 10) {
                showStatus('حجم الصورة يجب أن لا يتعدى 10 ميجابايت', 'error');
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                return;
            }
        }

        const formData = new FormData(form);

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                body: formData
            });

            let result;
            try {
                result = await response.json();
            } catch (e) {
                // Should handle HTML responses (like 413 from Nginx or 502/500 proxies)
                console.error('Non-JSON response received');
                throw new Error('Server returned an invalid response');
            }

            if (response.ok) {
                showStatus('تم تسجيل البيانات بنجاح!', 'success');
                form.reset();
                // Reset dropdowns
                adminSelect.disabled = true;
                adminSelect.innerHTML = '<option value="">اختر الإدارة أولاً...</option>';
                schoolSelect.disabled = true;
                schoolSelect.innerHTML = '<option value="">اختر المدرسة أولاً...</option>';
            } else {
                if (response.status === 413) {
                    showStatus('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت', 'error');
                } else {
                    showStatus(result.message || 'حدث خطأ أثناء التسجيل', 'error');
                }
            }
        } catch (error) {
            console.error('Submission error:', error);
            showStatus('حدث خطأ في الاتصال بالخادم (تأكد من صغر حجم الصورة)', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    });

    function showStatus(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.className = `alert ${type}`;
        statusMessage.style.display = 'block';
        window.scrollTo(0, 0); // Scroll to top to see message
    }
});
