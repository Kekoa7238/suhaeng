document.addEventListener('DOMContentLoaded', () => {

    // --- Firebase 초기화 ---
    const firebaseConfig = {
      apiKey: "AIzaSyCcMuN4tcOelecsMpDklhf5PSpfYh6-Z0M",
      authDomain: "suhaeng-82028.firebaseapp.com",
      databaseURL: "https://suhaeng-82028-default-rtdb.firebaseio.com",
      projectId: "suhaeng-82028",
      storageBucket: "suhaeng-82028.appspot.com",
      messagingSenderId: "839622151756",
      appId: "1:839622151756:web:a3b4feb175b59d1f4a2ee9",
      measurementId: "G-BTF5SFZ5C2"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const assessmentsRef = database.ref('assessments');

    // --- DOM 요소 ---
    const monthYearElement = document.getElementById('month-year');
    const calendarBody = document.getElementById('calendar-body');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const modal = document.getElementById('details-modal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const modalDateTitle = document.getElementById('modal-date-title');
    const assessmentDetailsList = document.getElementById('assessment-details-list');
    const addAssessmentBtn = document.getElementById('add-assessment-btn');
    const formContainer = document.getElementById('assessment-form-container');
    const assessmentForm = document.getElementById('assessment-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const hiddenAssessmentId = document.getElementById('assessment-id');
    const imageInput = document.getElementById('assessment-image');

    // --- 상태 관리 ---
    let currentDate = new Date();
    let selectedDate = null;
    let assessments = {};

    // --- 데이터 읽기 ---
    assessmentsRef.on('value', (snapshot) => {
        assessments = snapshot.val() || {};
        renderCalendar();
        if (modal.style.display === 'block' && selectedDate) {
            renderAssessmentList(selectedDate);
        }
    });

    // --- 함수 정의 ---
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearElement.textContent = `${year}년 ${month + 1}월`;
        calendarBody.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
        const lastDateOfPrevMonth = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth; i > 0; i--) { calendarBody.appendChild(createDayCell(lastDateOfPrevMonth - i + 1, true)); }
        for (let i = 1; i <= lastDateOfMonth; i++) {
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const cell = createDayCell(i, false, fullDate);
            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) { cell.classList.add('today'); }
            if (assessments[fullDate]) {
                const list = document.createElement('ul');
                list.className = 'assessments-on-day';
                Object.values(assessments[fullDate]).forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.className = 'assessment-entry';
                    listItem.textContent = `${item.period}교시: ${item.subject}`;
                    list.appendChild(listItem);
                });
                cell.appendChild(list);
            }
            calendarBody.appendChild(cell);
        }
        const totalCells = calendarBody.children.length;
        const nextDays = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= nextDays; i++) { calendarBody.appendChild(createDayCell(i, true)); }
    };

    const createDayCell = (date, isOtherMonth = false, fullDateStr = '') => {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `<span class="date-number">${date}</span>`;
        if (isOtherMonth) {
            cell.classList.add('other-month');
        } else {
            cell.dataset.date = fullDateStr;
        }
        return cell;
    };

    const renderAssessmentList = (dateStr) => {
        assessmentDetailsList.innerHTML = '';
        const dataForDate = assessments[dateStr];
        if (!dataForDate) {
            assessmentDetailsList.innerHTML = '<p>등록된 수행평가가 없습니다.</p>';
            return;
        }
        Object.entries(dataForDate).forEach(([id, item]) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            const imageHTML = item.imageUrl ? `<img src="${item.imageUrl}" class="item-image" alt="수행평가 이미지">` : '';
            itemDiv.innerHTML = `
                <div class="content">
                    <p><span class="subject">${item.period}교시: ${item.subject}</span></p>
                    <p>${item.description}</p>
                    ${imageHTML}
                </div>
                <div class="actions">
                    <button class="edit-btn" data-id="${id}">수정</button>
                    <button class="delete-btn" data-id="${id}">삭제</button>
                </div>`;
            assessmentDetailsList.appendChild(itemDiv);
        });
    };

    const toggleForm = (show, data = null) => {
        assessmentForm.reset();
        hiddenAssessmentId.value = '';
        if (data) {
            hiddenAssessmentId.value = data.id;
            document.getElementById('assessment-period').value = data.period;
            document.getElementById('assessment-subject').value = data.subject;
            document.getElementById('assessment-description').value = data.description;
        }
        formContainer.style.display = show ? 'block' : 'none';
        addAssessmentBtn.style.display = show ? 'none' : 'block';
        assessmentDetailsList.style.display = show ? 'none' : 'block';
    };

    function saveDataToDatabase(id, data) {
        const saveBtn = document.getElementById('save-btn');
        let dbOperation;
        if (id) {
            const oldImageUrl = assessments[selectedDate]?.[id]?.imageUrl;
            if (!data.imageUrl && oldImageUrl) {
                data.imageUrl = oldImageUrl;
            }
            dbOperation = database.ref(`assessments/${selectedDate}/${id}`).update(data);
        } else {
            dbOperation = database.ref(`assessments/${selectedDate}`).push(data);
        }
        dbOperation
            .then(() => {
                toggleForm(false);
            })
            .catch((error) => console.error('DB 저장 실패:', error))
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = '저장';
            });
    }

    // --- 이벤트 리스너 ---
    assessmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';

        const assessmentId = hiddenAssessmentId.value;
        const file = imageInput.files[0];
        
        const textData = {
            period: document.getElementById('assessment-period').value,
            subject: document.getElementById('assessment-subject').value,
            description: document.getElementById('assessment-description').value,
        };

        if (file) {
            // ▼▼▼ ImgBB 이미지 업로드 로직 ▼▼▼
            const apiKey = "7385d2891d09a1eef32117615eae30b4";
            const formData = new FormData();
            formData.append('image', file);

            fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    textData.imageUrl = result.data.url;
                    saveDataToDatabase(assessmentId, textData);
                } else {
                    throw new Error(result.error.message);
                }
            })
            .catch(error => {
                console.error("ImgBB 업로드 실패:", error);
                alert("이미지 업로드에 실패했습니다: " + error.message);
                saveBtn.disabled = false;
                saveBtn.textContent = '저장';
            });
        } else {
            saveDataToDatabase(assessmentId, textData);
        }
    });

    assessmentDetailsList.addEventListener('click', (e) => {
        const target = e.target;
        const assessmentId = target.dataset.id;
        if (!assessmentId) return;
        const assessmentData = assessments[selectedDate]?.[assessmentId];
        if (target.classList.contains('edit-btn')) {
            toggleForm(true, { id: assessmentId, ...assessmentData });
        }
        if (target.classList.contains('delete-btn')) {
            if (confirm('정말 삭제하시겠습니까?')) {
                // TODO: ImgBB에 올린 이미지를 삭제하는 기능은 유료 플랜에서만 제공되므로,
                // 여기서는 데이터베이스의 정보만 삭제합니다.
                database.ref(`assessments/${selectedDate}/${assessmentId}`).remove();
            }
        }
    });
    
    const closeModal = () => { modal.style.display = 'none'; selectedDate = null; };
    calendarBody.addEventListener('click', (e) => { const cell = e.target.closest('.day-cell'); if (cell && !cell.classList.contains('other-month')) { selectedDate = cell.dataset.date; modalDateTitle.textContent = selectedDate; renderAssessmentList(selectedDate); toggleForm(false); modal.style.display = 'block'; } });
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    addAssessmentBtn.addEventListener('click', () => { toggleForm(true); });
    cancelBtn.addEventListener('click', () => { toggleForm(false); });
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
});