
// مدیریت نظرات
document.addEventListener('DOMContentLoaded', function() {
    const commentsContainer = document.getElementById('comments-container');
    const commentForm = document.getElementById('comment-form');
    const postId = document.querySelector('.post-detail').getAttribute('data-post-id');
    
    // بارگذاری نظرات
    loadComments();
    
    // افزودن رویدادها
    if (commentForm) {
        commentForm.addEventListener('submit', submitComment);
    }

    // بارگذاری نظرات از فایل JSON
    function loadComments() {
        try {
            const commentsData = localStorage.getItem('comments');
            const comments = commentsData ? JSON.parse(commentsData) : [];
            const postComments = comments.find(item => item.postId === postId);
            
            if (postComments && postComments.comments && postComments.comments.length > 0) {
                renderComments(postComments.comments);
            } else {
                showNoComments();
            }
        } catch (error) {
            console.error('خطا در بارگذاری نظرات:', error);
            showNoComments();
        }
    }
    
    // نمایش نظرات
    function renderComments(comments) {
        commentsContainer.innerHTML = '';
        
        comments.forEach(comment => {
            const commentElement = createCommentElement(comment);
            commentsContainer.appendChild(commentElement);
        });
    }
    
    // ایجاد المان نظر
    function createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        commentDiv.id = comment.id;
        
        const commentHeader = document.createElement('div');
        commentHeader.className = 'comment-header';
        
        const authorSpan = document.createElement('span');
        authorSpan.className = 'comment-author';
        authorSpan.textContent = comment.author;
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'comment-date';
        dateSpan.textContent = comment.date;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'comment-actions';
        
        const replyBtn = document.createElement('button');
        replyBtn.className = 'action-btn reply-btn';
        replyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 17L6.5 14.5L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 14.5H6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        replyBtn.addEventListener('click', () => showReplyForm(comment.id));
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        editBtn.addEventListener('click', () => showEditForm(comment));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.418C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4173C6.7048 21.1263 6.296 20.7415 5.97868 20.2858C5.33688 19.3639 5.25945 18.0815 5.10457 15.5167L4.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.89809 2.28601 9.80498 2.3459 9.71747 2.41317C9.32057 2.70777 9.09706 3.18069 8.6501 4.12655L8.05292 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.5 16.5L9.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.5 16.5L14.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        deleteBtn.addEventListener('click', () => deleteComment(comment.id));
        
        commentHeader.appendChild(authorSpan);
        commentHeader.appendChild(dateSpan);
        
        actionsDiv.appendChild(replyBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        commentHeader.appendChild(actionsDiv);
        
        const commentBody = document.createElement('div');
        commentBody.className = 'comment-body';
        commentBody.textContent = comment.text;
        
        commentDiv.appendChild(commentHeader);
        commentDiv.appendChild(commentBody);
        
        // اگر پاسخ‌ها وجود داشت
        if (comment.replies && comment.replies.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'replies-container';
            
            comment.replies.forEach(reply => {
                const replyElement = createReplyElement(reply);
                repliesContainer.appendChild(replyElement);
            });
            
            commentDiv.appendChild(repliesContainer);
        }
        
        return commentDiv;
    }
    
    // ایجاد المان پاسخ
    function createReplyElement(reply) {
        const replyDiv = document.createElement('div');
        replyDiv.className = 'reply';
        replyDiv.id = reply.id;
        
        const replyHeader = document.createElement('div');
        replyHeader.className = 'reply-header';
        
        const authorSpan = document.createElement('span');
        authorSpan.className = 'reply-author';
        authorSpan.textContent = reply.author;
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'reply-date';
        dateSpan.textContent = reply.date;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'reply-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        editBtn.addEventListener('click', () => showEditReplyForm(reply, replyDiv));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.418C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4173C6.7048 21.1263 6.296 20.7415 5.97868 20.2858C5.33688 19.3639 5.25945 18.0815 5.10457 15.5167L4.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.89809 2.28601 9.80498 2.3459 9.71747 2.41317C9.32057 2.70777 9.09706 3.18069 8.6501 4.12655L8.05292 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.5 16.5L9.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.5 16.5L14.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        deleteBtn.addEventListener('click', () => deleteReply(reply.id));
        
        replyHeader.appendChild(authorSpan);
        replyHeader.appendChild(dateSpan);
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        replyHeader.appendChild(actionsDiv);
        
        const replyBody = document.createElement('div');
        replyBody.className = 'reply-body';
        replyBody.textContent = reply.text;
        
        replyDiv.appendChild(replyHeader);
        replyDiv.appendChild(replyBody);
        
        return replyDiv;
    }
    
    // نمایش فرم پاسخ به نظر
    function showReplyForm(commentId) {
        const comment = document.getElementById(commentId);
        
        // حذف فرم‌های پاسخ قبلی
        const existingForms = document.querySelectorAll('.reply-form');
        existingForms.forEach(form => form.remove());
        
        const replyForm = document.createElement('div');
        replyForm.className = 'reply-form';
        
        replyForm.innerHTML = `
            <input type="text" id="reply-author-${commentId}" placeholder="نام شما" required>
            <textarea id="reply-text-${commentId}" placeholder="پاسخ خود را بنویسید..." required></textarea>
            <div class="form-buttons">
                <button type="button" class="reply-submit">ارسال پاسخ</button>
                <button type="button" class="cancel-btn">انصراف</button>
            </div>
        `;
        
        comment.appendChild(replyForm);
        
        const submitButton = replyForm.querySelector('.reply-submit');
        submitButton.addEventListener('click', () => submitReply(commentId));
        
        const cancelButton = replyForm.querySelector('.cancel-btn');
        cancelButton.addEventListener('click', () => replyForm.remove());
    }
    
    // ارسال پاسخ به نظر
    function submitReply(commentId) {
        const authorInput = document.getElementById(`reply-author-${commentId}`);
        const textInput = document.getElementById(`reply-text-${commentId}`);
        
        const author = authorInput.value.trim();
        const text = textInput.value.trim();
        
        if (!author || !text) {
            alert('لطفاً تمام فیلدها را پر کنید.');
            return;
        }
        
        // در دنیای واقعی اینجا یک درخواست به سرور ارسال می‌شود
        // اما در این مثال فقط به کاربر اطلاع می‌دهیم
        alert('پاسخ شما با موفقیت ثبت شد و پس از تایید نمایش داده خواهد شد.');
        
        const replyForm = document.querySelector('.reply-form');
        if (replyForm) {
            replyForm.remove();
        }
    }
    
    // نمایش فرم ویرایش نظر
    function showEditForm(comment) {
        const commentElement = document.getElementById(comment.id);
        const commentBody = commentElement.querySelector('.comment-body');
        
        // ذخیره متن اصلی برای بازگشت در صورت انصراف
        const originalText = commentBody.textContent;
        
        const editForm = document.createElement('div');
        editForm.className = 'edit-form';
        
        editForm.innerHTML = `
            <textarea id="edit-text-${comment.id}" required>${originalText}</textarea>
            <div class="form-buttons">
                <button type="button" class="save-btn">ذخیره</button>
                <button type="button" class="cancel-btn">انصراف</button>
            </div>
        `;
        
        // جایگزینی محتوای نظر با فرم ویرایش
        commentBody.innerHTML = '';
        commentBody.appendChild(editForm);
        
        const saveButton = editForm.querySelector('.save-btn');
        saveButton.addEventListener('click', () => updateComment(comment.id));
        
        const cancelButton = editForm.querySelector('.cancel-btn');
        cancelButton.addEventListener('click', () => {
            commentBody.textContent = originalText;
        });
    }
    
    // نمایش فرم ویرایش پاسخ
    function showEditReplyForm(reply, replyElement) {
        const replyBody = replyElement.querySelector('.reply-body');
        const originalText = replyBody.textContent;
        
        const editForm = document.createElement('div');
        editForm.className = 'edit-form';
        
        editForm.innerHTML = `
            <textarea id="edit-reply-${reply.id}" required>${originalText}</textarea>
            <div class="form-buttons">
                <button type="button" class="save-btn">ذخیره</button>
                <button type="button" class="cancel-btn">انصراف</button>
            </div>
        `;
        
        // جایگزینی محتوای پاسخ با فرم ویرایش
        replyBody.innerHTML = '';
        replyBody.appendChild(editForm);
        
        const saveButton = editForm.querySelector('.save-btn');
        saveButton.addEventListener('click', () => updateReply(reply.id));
        
        const cancelButton = editForm.querySelector('.cancel-btn');
        cancelButton.addEventListener('click', () => {
            replyBody.textContent = originalText;
        });
    }
    
    // به‌روزرسانی نظر
    function updateComment(commentId) {
        const textInput = document.getElementById(`edit-text-${commentId}`);
        const text = textInput.value.trim();
        
        if (!text) {
            alert('متن نظر نمی‌تواند خالی باشد.');
            return;
        }
        
        // در دنیای واقعی اینجا یک درخواست به سرور ارسال می‌شود
        const commentElement = document.getElementById(commentId);
        const commentBody = commentElement.querySelector('.comment-body');
        commentBody.textContent = text;
        
        alert('نظر شما با موفقیت به‌روزرسانی شد.');
    }
    
    // به‌روزرسانی پاسخ
    function updateReply(replyId) {
        const textInput = document.getElementById(`edit-reply-${replyId}`);
        const text = textInput.value.trim();
        
        if (!text) {
            alert('متن پاسخ نمی‌تواند خالی باشد.');
            return;
        }
        
        // در دنیای واقعی اینجا یک درخواست به سرور ارسال می‌شود
        const replyElement = document.getElementById(replyId);
        const replyBody = replyElement.querySelector('.reply-body');
        replyBody.textContent = text;
        
        alert('پاسخ شما با موفقیت به‌روزرسانی شد.');
    }
    
    // حذف نظر
    function deleteComment(commentId) {
        if (confirm('آیا از حذف این نظر اطمینان دارید؟')) {
            // در دنیای واقعی اینجا یک درخواست به سرور ارسال می‌شود
            const commentElement = document.getElementById(commentId);
            commentElement.remove();
            
            alert('نظر با موفقیت حذف شد.');
        }
    }
    
    // حذف پاسخ
    function deleteReply(replyId) {
        if (confirm('آیا از حذف این پاسخ اطمینان دارید؟')) {
            // در دنیای واقعی اینجا یک درخواست به سرور ارسال می‌شود
            const replyElement = document.getElementById(replyId);
            replyElement.remove();
            
            alert('پاسخ با موفقیت حذف شد.');
        }
    }
    
    // ارسال نظر جدید
    function submitComment(event) {
        event.preventDefault();
        
        const nameInput = document.getElementById('comment-author');
        const textInput = document.getElementById('comment-text');
        
        const author = nameInput.value.trim();
        const text = textInput.value.trim();
        
        if (!author || !text) {
            alert('لطفاً تمام فیلدها را پر کنید.');
            return;
        }
        
        // در دنیای واقعی اینجا یک درخواست به سرور ارسال می‌شود
        // در اینجا فقط یک نظر موقت نمایش می‌دهیم
        const now = new Date();
        const options = { month: 'long', day: 'numeric' };
        const persianDate = new Intl.DateTimeFormat('fa-IR', options).format(now);
        
        const tempComment = {
            id: 'temp-' + Date.now(),
            author: author,
            text: text,
            date: 'هم اکنون',
            replies: []
        };
        
        const commentElement = createCommentElement(tempComment);
        commentElement.classList.add('new-comment');
        
        // اگر نظری وجود ندارد، پیام "نظری وجود ندارد" را حذف کنیم
        if (document.querySelector('.no-comments')) {
            commentsContainer.innerHTML = '';
        }
        
        commentsContainer.prepend(commentElement);
        
        // افزودن کلاس نمایش با تأخیر برای اعمال انیمیشن
        setTimeout(() => {
            commentElement.classList.add('show');
        }, 10);
        
        // نمایش پیام موفقیت
        const successMessage = document.createElement('div');
        successMessage.className = 'comment-success';
        successMessage.textContent = 'نظر شما با موفقیت ثبت شد و پس از تایید نمایش داده خواهد شد.';
        
        commentForm.insertAdjacentElement('afterend', successMessage);
        
        // حذف پیام موفقیت پس از چند ثانیه
        setTimeout(() => {
            successMessage.remove();
        }, 5000);
        
        // پاک کردن فرم
        nameInput.value = '';
        textInput.value = '';
    }
    
    // نمایش پیام "نظری وجود ندارد"
    function showNoComments() {
        commentsContainer.innerHTML = '<div class="no-comments">هنوز نظری ثبت نشده است. اولین نفری باشید که نظر می‌دهد!</div>';
    }
});
