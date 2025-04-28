/**
 * وبلاگ من - اسکریپت اصلی
 * این اسکریپت به صورت ماژولار طراحی شده است
 */

// تنظیمات سراسری
const CONFIG = {
    POSTS_PER_PAGE: 5,
    ANIMATION_DURATION: 400,
    COOKIE_DAYS: 7,
    SEARCH_MIN_LENGTH: 2
};

// مدیریت داده‌ها
const DataManager = {
    posts: [],
    currentPage: 1,
    searchResults: [],
    isSearchActive: false,

    // دریافت مقالات از سرور
    loadPosts: async function() {
        try {
            const response = await fetch('posts.json');
            if (!response.ok) throw new Error('خطا در دریافت مقالات');

            // دریافت متن JSON به صورت خام
            const jsonText = await response.text();

            // بررسی اینکه JSON خالی نباشد
            if (!jsonText || jsonText.trim() === '') {
                throw new Error('فایل JSON خالی است');
            }

            try {
                // تبدیل متن به آبجکت JSON
                const data = JSON.parse(jsonText);

                // بررسی اعتبار داده‌های دریافتی
                if (!Array.isArray(data)) {
                    throw new Error('فرمت داده‌های دریافتی نامعتبر است');
                }

                this.posts = data;

                // بررسی پارامترهای URL
                this.checkUrlParams();

                return true;
            } catch (parseError) {
                console.error('خطا در پردازش JSON مقالات:', parseError);
                throw new Error('خطا در پردازش فایل JSON: ' + parseError.message);
            }
        } catch (error) {
            console.error('خطا در بارگذاری مقالات:', error);
            UI.showError('متأسفانه در بارگذاری مقالات مشکلی پیش آمد. لطفا صفحه را مجدداً بارگذاری کنید. (خطا: ' + error.message + ')');
            return false;
        }
    },

    // بررسی پارامترهای URL
    checkUrlParams: function() {
        // چک کردن پارامتر جستجو
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        if (searchQuery) {
            document.getElementById('search-input').value = searchQuery;
            SearchManager.performSearch(searchQuery);
            return;
        }

        // چک کردن هش برای مقاله
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            const postId = hash.substring(1);
            if (postId.startsWith('page=')) {
                // صفحه‌بندی
                const pageNum = parseInt(postId.replace('page=', ''));
                if (!isNaN(pageNum) && pageNum > 0) {
                    this.currentPage = pageNum;
                }
            } else {
                // نمایش مقاله
                UI.showDetail(postId);
                return;
            }
        }

        // در غیر این صورت، نمایش لیست مقالات
        UI.renderList();
        UI.renderPagination();
    },

    // دریافت مقالات فعلی با توجه به صفحه‌بندی
    getCurrentPagePosts: function() {
        const start = (this.currentPage - 1) * CONFIG.POSTS_PER_PAGE;
        const end = Math.min(start + CONFIG.POSTS_PER_PAGE, this.posts.length);
        return this.posts.slice(start, end);
    },

    // دریافت تعداد کل صفحات
    getTotalPages: function() {
        return Math.ceil(this.posts.length / CONFIG.POSTS_PER_PAGE);
    },

    // دریافت مقاله با ID
    getPostById: function(id) {
        return this.posts.find(p => p.id === id);
    }
};

// مدیریت جستجو
const SearchManager = {
    // کلمات کلیدی پیشنهادی برای جستجو
    suggestedKeywords: ['HttpOnly', 'XSS', 'CSRF', 'SQL Injection', 'امنیت وب', 'فیشینگ', 'OWASP', 'حمله‌های سایبری'],

    // انجام جستجو
    performSearch: function(query) {
        if (!query || query.trim().length < CONFIG.SEARCH_MIN_LENGTH) {
            this.exitSearch();
            return;
        }

        query = query.trim().toLowerCase();

        // امتیازدهی به نتایج جستجو
        const scoredResults = DataManager.posts.map(post => {
            let score = 0;

            // امتیاز دادن به عنوان (وزن بیشتر)
            if (post.title.toLowerCase().includes(query)) {
                score += 10;
                // امتیاز بیشتر اگر عنوان با عبارت جستجو شروع شود
                if (post.title.toLowerCase().startsWith(query)) {
                    score += 5;
                }
            }

            // امتیاز دادن به خلاصه
            if (post.excerpt.toLowerCase().includes(query)) {
                score += 5;
            }

            // امتیاز دادن به محتوا
            if (post.content.toLowerCase().includes(query)) {
                // تعداد تکرار کلمه در محتوا
                const contentMatches = (post.content.toLowerCase().match(new RegExp(query, 'g')) || []).length;
                score += Math.min(contentMatches, 5); // حداکثر 5 امتیاز برای تکرار
            }

            // امتیاز دادن به تگ‌ها اگر وجود داشته باشند
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(query)) {
                        score += 8;
                    }
                });
            }

            return { post, score };
        });

        // فیلتر کردن نتایج با امتیاز و مرتب‌سازی بر اساس امتیاز
        const filteredResults = scoredResults
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(result => result.post);

        DataManager.searchResults = filteredResults;
        DataManager.searchQuery = query;
        DataManager.isSearchActive = true;

        // به‌روزرسانی URL
        const url = new URL(window.location);
        url.searchParams.set('search', query);
        window.history.pushState({search: query}, '', url);

        // نمایش نتایج
        UI.showSearchResults(query);
    },

    // خروج از حالت جستجو
    exitSearch: function() {
        DataManager.isSearchActive = false;

        // حذف پارامتر جستجو از URL
        const url = new URL(window.location);
        url.searchParams.delete('search');
        window.history.pushState({}, '', url);

        // بازگشت به حالت عادی
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').hidden = true;
        document.getElementById('post-list').hidden = false;
        document.getElementById('pagination').hidden = false;
    },

    // برجسته کردن متن جستجو
    highlightText: function(text, searchTerm) {
        if (!searchTerm) return text;

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-term-highlight">$1</span>');
    }
};

// مدیریت رابط کاربری
const UI = {
    // رندر لیست مقالات
    renderList: function() {
        const list = document.getElementById('post-list');
        list.innerHTML = '';

        const currentPosts = DataManager.getCurrentPagePosts();

        if (currentPosts.length === 0) {
            list.innerHTML = '<div class="post"><p>مقاله‌ای برای نمایش وجود ندارد.</p></div>';
            return;
        }

        currentPosts.forEach(post => {
            const postElement = this.createPostElement(post);
            list.appendChild(postElement);
        });

        // اضافه کردن رویداد کلیک
        this.attachReadMoreListeners();
    },

    // ایجاد المان مقاله
    createPostElement: function(post, highlight = null) {
        const el = document.createElement('article');
        el.className = 'post';
        el.setAttribute('data-id', post.id);

        const title = document.createElement('h2');
        title.className = 'post-title';
        title.innerHTML = highlight ? 
            SearchManager.highlightText(post.title, highlight) : 
            post.title;

        const meta = document.createElement('p');
        meta.className = 'post-meta';
        meta.textContent = `تاریخ: ${post.date} | نویسنده: ${post.author}`;

        // نمایش بنر مقاله
        if (post.banner) {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'post-thumbnail';

            const image = document.createElement('img');
            image.src = post.banner;
            image.alt = post.title;
            image.loading = 'lazy';

            imageWrapper.appendChild(image);
            el.appendChild(title);
            el.appendChild(meta);
            el.appendChild(imageWrapper);
        } else {
            el.appendChild(title);
            el.appendChild(meta);
        }

        const excerpt = document.createElement('p');
        excerpt.className = 'excerpt';
        excerpt.innerHTML = highlight ? 
            SearchManager.highlightText(post.excerpt, highlight) : 
            post.excerpt;

        const readMore = document.createElement('a');
        readMore.href = `#${post.id}`;
        readMore.className = 'button read-more';
        readMore.textContent = 'ادامه مطلب';
        readMore.setAttribute('data-id', post.id);

        el.appendChild(excerpt);
        el.appendChild(readMore);

        // انیمیشن ظاهر شدن
        setTimeout(() => el.style.opacity = '1', 50);

        return el;
    },

    // نمایش نتایج جستجو
    showSearchResults: function(query) {
        document.getElementById('search-term').textContent = query;
        document.getElementById('post-list').hidden = true;
        document.getElementById('pagination').hidden = true;
        document.getElementById('post-detail').hidden = true;

        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';

        const searchResults = document.getElementById('search-results');
        searchResults.hidden = false;

        if (DataManager.searchResults.length === 0) {
            // ایجاد پیام عدم یافتن نتیجه به همراه پیشنهادات جستجو
            const noResultsEl = document.createElement('div');
            noResultsEl.className = 'post no-results';

            const noResultsMsg = document.createElement('p');
            noResultsMsg.textContent = 'نتیجه‌ای یافت نشد!';
            noResultsMsg.style.fontFamily = "'Dana', 'DanaFaNum', sans-serif";
            noResultsMsg.style.fontSize = "1.2rem";
            noResultsMsg.style.fontWeight = "500";

            const suggestionsTitle = document.createElement('p');
            suggestionsTitle.className = 'suggestions-title';
            suggestionsTitle.textContent = 'جستجوهای پیشنهادی:';
            suggestionsTitle.style.fontFamily = "'Dana', 'DanaFaNum', sans-serif";
            suggestionsTitle.style.marginTop = "1.5rem";
            suggestionsTitle.style.color = "var(--accent-color)";

            const suggestionsList = document.createElement('div');
            suggestionsList.className = 'search-suggestions';

            // نمایش پیشنهادات جستجو
            SearchManager.suggestedKeywords.forEach(keyword => {
                const suggestionBtn = document.createElement('button');
                suggestionBtn.className = 'suggestion-tag dana-font';
                suggestionBtn.textContent = keyword;
                suggestionBtn.style.fontFamily = "'Dana', 'DanaFaNum', sans-serif";
                suggestionBtn.addEventListener('click', () => {
                    document.getElementById('search-input').value = keyword;
                    SearchManager.performSearch(keyword);
                });
                suggestionsList.appendChild(suggestionBtn);
            });

            noResultsEl.appendChild(noResultsMsg);
            noResultsEl.appendChild(suggestionsTitle);
            noResultsEl.appendChild(suggestionsList);
            resultsContainer.appendChild(noResultsEl);
            return;
        }

        // نمایش تعداد نتایج یافت شده
        const resultsCount = document.createElement('div');
        resultsCount.className = 'results-count';
        resultsCount.textContent = `${DataManager.searchResults.length} نتیجه یافت شد`;
        resultsContainer.appendChild(resultsCount);

        // نمایش نتایج
        DataManager.searchResults.forEach(post => {
            const postElement = this.createPostElement(post, query);
            resultsContainer.appendChild(postElement);
        });

        // افزودن پیشنهادات جستجوی مرتبط
        const relatedSearches = document.createElement('div');
        relatedSearches.className = 'related-searches';

        const relatedTitle = document.createElement('p');
        relatedTitle.textContent = 'جستجوهای مرتبط:';

        const relatedTags = document.createElement('div');
        relatedTags.className = 'related-tags';

        // انتخاب چند کلمه کلیدی مرتبط برای پیشنهاد
        SearchManager.suggestedKeywords
            .filter(keyword => !keyword.toLowerCase().includes(query.toLowerCase()) && 
                               !query.toLowerCase().includes(keyword.toLowerCase()))
            .slice(0, 5)
            .forEach(keyword => {
                const relatedTag = document.createElement('button');
                relatedTag.className = 'suggestion-tag';
                relatedTag.textContent = keyword;
                relatedTag.addEventListener('click', () => {
                    document.getElementById('search-input').value = keyword;
                    SearchManager.performSearch(keyword);
                });
                relatedTags.appendChild(relatedTag);
            });

        relatedSearches.appendChild(relatedTitle);
        relatedSearches.appendChild(relatedTags);
        resultsContainer.appendChild(relatedSearches);

        // اضافه کردن رویداد کلیک
        document.querySelectorAll('#results-container .read-more').forEach(a =>
            a.addEventListener('click', e => {
                e.preventDefault();
                const id = e.target.getAttribute('data-id');
                if (id) UI.showDetail(id);
            })
        );
    },

    // رندر صفحه‌بندی
    renderPagination: function() {
        const totalPages = DataManager.getTotalPages();
        const nav = document.getElementById('pagination');
        nav.innerHTML = '';

        if (totalPages <= 1) return;

        // دکمه قبلی
        if (DataManager.currentPage > 1) {
            const prev = document.createElement('a');
            prev.href = '#page=' + (DataManager.currentPage - 1);
            prev.textContent = '«';
            prev.setAttribute('title', 'صفحه قبل');
            prev.addEventListener('click', e => {
                e.preventDefault();
                this.goToPage(DataManager.currentPage - 1);
            });
            nav.appendChild(prev);
        }

        // محدوده صفحات (نمایش حداکثر 5 عدد)
        const startPage = Math.max(1, DataManager.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            const a = document.createElement('a');
            a.href = '#page=' + i;
            a.textContent = i;
            a.setAttribute('title', 'صفحه ' + i);

            if (i === DataManager.currentPage) a.classList.add('active');

            a.addEventListener('click', e => {
                e.preventDefault();
                this.goToPage(i);
            });

            nav.appendChild(a);
        }

        // دکمه بعدی
        if (DataManager.currentPage < totalPages) {
            const next = document.createElement('a');
            next.href = '#page=' + (DataManager.currentPage + 1);
            next.textContent = '»';
            next.setAttribute('title', 'صفحه بعد');
            next.addEventListener('click', e => {
                e.preventDefault();
                this.goToPage(DataManager.currentPage + 1);
            });
            nav.appendChild(next);
        }
    },

    // رفتن به صفحه مشخص
    goToPage: function(pageNumber) {
        DataManager.currentPage = pageNumber;

        // به‌روزرسانی URL
        history.pushState({page: pageNumber}, '', `#page=${pageNumber}`);

        this.renderList();
        this.renderPagination();
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    // نمایش جزئیات مقاله
    showDetail: function(id) {
        const post = DataManager.getPostById(id);
        if (!post) return;

        try {
            // ایجاد URL برای صفحه جدید مقاله
            let articleURL = `article.html?id=${id}`;

            // به صفحه مقاله هدایت می‌کنیم
            window.location.href = articleURL;
        } catch (error) {
            console.error("خطا در نمایش مقاله:", error);
            alert("متأسفانه در بارگذاری مقاله مشکلی پیش آمد. لطفا صفحه را مجدداً بارگذاری کنید.");
        }
    },

    // نمایش جزئیات مقاله در همان صفحه (روش قبلی)
    showDetailInline: function(id) {
        const post = DataManager.getPostById(id);
        if (!post) return;

        document.getElementById('post-list').hidden = true;
        document.getElementById('pagination').hidden = true;
        document.getElementById('search-results').hidden = true;

        const detailElement = document.getElementById('post-detail');
        if (!detailElement) return;

        detailElement.hidden = false;
        detailElement.classList.add('fade-in');

        // تنظیم عنوان و متادیتا
        const titleElement = detailElement.querySelector('#detail-title');
        if (titleElement) titleElement.textContent = post.title;

        const date = post.date || 'تاریخ: ۷ اردیبهشت ۱۴۰۴';
        const metaElement = detailElement.querySelector('#detail-meta');
        if (metaElement) metaElement.textContent = `تاریخ: ${date} | نویسنده: ${post.author}`;

        // پاک کردن محتوای قبلی
        const contentContainer = detailElement.querySelector('#detail-content');
        if (!contentContainer) return;
        contentContainer.innerHTML = '';

        // اضافه کردن تصویر شاخص اگر وجود داشته باشد
        if (post.image) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'post-featured-image';

            const img = document.createElement('img');
            img.src = post.image;
            img.alt = post.title;
            img.loading = 'eager';

            imgContainer.appendChild(img);
            contentContainer.appendChild(imgContainer);
        }

        // اضافه کردن انیمیشن برای نمایش تدریجی محتوا
        setTimeout(() => {
            // افزودن محتوای اصلی مقاله
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'post-content-wrapper';
            contentWrapper.innerHTML = SecurityUtils.sanitizeHTML(post.content);
            contentContainer.appendChild(contentWrapper);

            // اضافه کردن انیمیشن به پاراگراف‌ها
            contentContainer.querySelectorAll('p, h2, h3, h4, ul, pre, code').forEach((element, index) => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(10px)';
                element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, 100 + (index * 50));
            });

            // هایلایت کردن کلمات کلیدی
            this.highlightKeywords();

            // مدیریت رسانه‌ها
            this.handleMediaElements();

            // اضافه کردن دکمه اشتراک‌گذاری
            this.addShareButton(post);
        }, 50);

        // ذخیره آخرین مقاله دیده شده در کوکی
        SecurityUtils.setCookie('last_viewed_post', id, CONFIG.COOKIE_DAYS);

        // به‌روزرسانی URL
        history.pushState({id: post.id}, post.title, `#${post.id}`);

        // اسکرول به بالای صفحه
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    // اضافه کردن دکمه اشتراک‌گذاری
    addShareButton: function(post) {
        const contentContainer = document.getElementById('detail-content');

        // ایجاد باکس اشتراک‌گذاری با طراحی بهتر
        const shareBox = document.createElement('div');
        shareBox.className = 'share-box';

        const shareTitle = document.createElement('div');
        shareTitle.className = 'share-title';
        shareTitle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg><span>این مقاله را به اشتراک بگذارید:</span>';

        const shareBtns = document.createElement('div');
        shareBtns.className = 'share-buttons';

        // آرایه‌ای از شبکه‌های اجتماعی
        const socialNetworks = [
            {
                name: 'کپی لینک',
                class: 'copy-link',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
                action: (url, title) => {
                    navigator.clipboard.writeText(url).then(() => {
                        const copyBtn = document.querySelector('.copy-link');
                        copyBtn.classList.add('copied');
                        const copyBtnSpan = copyBtn.querySelector('span');
                        copyBtnSpan.textContent = '✓ کپی شد!';
                        copyBtn.style.backgroundColor = '#e67e22';
                        copyBtn.style.borderColor = '#d35400';
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                            copyBtnSpan.textContent = 'کپی لینک';
                            copyBtn.style.backgroundColor = '';
                            copyBtn.style.borderColor = '';
                        }, 2000);
                    });
                }
            },
            {
                name: 'تلگرام',
                class: 'telegram-share',
                color: '#0088cc',
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#0088cc" xmlns="http://www.w3.org/2000/svg"><path d="M22.0717 3.57277C21.8063 3.34026 21.4482 3.25452 21.1168 3.34026L2.83748 9.34026C2.39498 9.46725 2.09123 9.83027 2.01873 10.2866C1.95061 10.7428 2.13436 11.1764 2.50311 11.4153L6.57886 14.2053V19.9991C6.57886 20.4553 6.82936 20.8678 7.22561 21.0928C7.4186 21.1991 7.63873 21.2491 7.85323 21.2491C8.0771 21.2491 8.29685 21.1928 8.4961 21.0928L12.5719 18.9303L15.5781 21.5553C15.8622 21.8116 16.2396 21.9491 16.6296 21.9491C16.7156 21.9491 16.8081 21.9428 16.8969 21.9241C17.3781 21.8178 17.7781 21.5053 17.9656 21.0616L22.2781 4.56152C22.4031 4.23027 22.3281 3.8053 22.0717 3.57277Z" fill="#0088cc"/></svg>',
                url: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
            },
            {
                name: 'توییتر',
                class: 'twitter-share',
                color: '#1da1f2',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>',
                url: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
            },
            {
                name: 'واتساپ',
                class: 'whatsapp-share',
                color: '#25d366',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375c-.99-1.576-1.516-3.391-1.516-5.26 0-5.445 4.455-9.885 9.942-9.885 2.654 0 5.145 1.035 7.021 2.91 1.875 1.859 2.909 4.35 2.909 6.99-.004 5.444-4.46 9.885-9.935 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411"/></svg>',
                url: (url, title) => `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`
            },
            {
                name: 'لینکدین',
                class: 'linkedin-share',
                color: '#0077b5',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 5455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 0-1.139-.925 2.064-2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zzM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
                url: (url, title) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
            }
        ];

        // تابع تبدیل به PDF
        async function generatePDF(content, title) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFont('Dana');
            doc.setR2L(true);
            doc.text(title, 200, 10, { align: 'right' });
            doc.text(content, 200, 30, { align: 'right' });
            doc.save(`${title}.pdf`);
        }

        // ایجاد دکمه‌های اشتراک‌گذاری
        const postUrl = window.location.href;
        const pdfButton = {
            name: 'دانلود PDF',
            class: 'pdf-download',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
            action: (url, title, content) => generatePDF(content, title)
        };

        socialNetworks.unshift(pdfButton);
        socialNetworks.forEach(network => {
            if (network.name === 'کپی لینک') {
                // ایجاد دکمه کپی لینک
                const button = document.createElement('button');
                button.className = `share-btn ${network.class}`;
                button.innerHTML = `${network.icon}<span>${network.name}</span>`;
                button.addEventListener('click', () => network.action(postUrl, post.title));
                shareBtns.appendChild(button);
            } else {
                // ایجاد لینک شبکه‌های اجتماعی
                const link = document.createElement('a');
                link.className = `share-btn ${network.class}`;
                link.innerHTML = `${network.icon}<span>${network.name}</span>`;
                if (network.color) {
                    link.style.backgroundColor = network.color;
                    link.style.color = "white";
                    link.style.borderColor = network.color;
                }
                link.href = network.url(postUrl, post.title);
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                shareBtns.appendChild(link);
            }
        });

        shareBox.appendChild(shareTitle);
        shareBox.appendChild(shareBtns);

        contentContainer.appendChild(shareBox);
    },

    // اتصال رویدادها به دکمه‌های "ادامه مطلب"
    attachReadMoreListeners: function() {
        document.querySelectorAll('.read-more').forEach(a =>
            a.addEventListener('click', e => {
                e.preventDefault();
                const id = e.target.getAttribute('data-id');
                if (id) this.showDetail(id);
            })
        );
    },

    // مدیریت رسانه‌ها در محتوای مقاله
    handleMediaElements: function() {
        // لود تنبل (lazy loading) تصاویر
        document.querySelectorAll('#detail-content img').forEach(img => {
            img.loading = 'lazy';

            // افزودن کلاس برای انیمیشن ظهور
            img.classList.add('lazy-image');

            // افزودن قابلیت بزرگنمایی با کلیک
            img.addEventListener('click', () => {
                this.showImageViewer(img.src, img.alt);
            });
        });

        // افزودن قابلیت کپی به بلوک‌های کد
        document.querySelectorAll('#detail-content pre').forEach(pre => {
            const codeBlock = pre.querySelector('code') || pre;
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-button';
            copyButton.textContent = 'کپی کد';
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(codeBlock.textContent)
                    .then(() => {
                        const originalText = copyButton.textContent;
                        copyButton.textContent = 'کپی شد! ✓';
                        copyButton.style.backgroundColor = '#10b981';
                        setTimeout(() => {
                            copyButton.textContent = originalText;
                            copyButton.style.backgroundColor = '';
                        }, 2000);
                    })
                    .catch(err => console.error('خطا در کپی کردن:', err));
            });

            pre.style.position = 'relative';
            pre.appendChild(copyButton);
        });
    },

    // نمایش ویوئر تصویر
    showImageViewer: function(src, alt) {
        // ایجاد یک لایه مودال برای نمایش تصویر
        const viewer = document.createElement('div');
        viewer.className = 'image-viewer';

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt || 'تصویر بزرگ';

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'بستن');

        viewer.appendChild(img);
        viewer.appendChild(closeButton);

        document.body.appendChild(viewer);

        // جلوگیری از اسکرول صفحه هنگام باز بودن ویوئر
        document.body.style.overflow = 'hidden';

        // رویداد بستن ویوئر
        closeButton.addEventListener('click', () => {
            document.body.removeChild(viewer);
            document.body.style.overflow = '';
        });

        // بستن با کلیک بیرون از تصویر
        viewer.addEventListener('click', e => {
            if (e.target === viewer) {
                document.body.removeChild(viewer);
                document.body.style.overflow = '';
            }
        });
    },

    // هایلایت کردن کلمات کلیدی و بهبود نمایش منابع
    highlightKeywords: function() {
        // لیستی از کلمات کلیدی
        const keywords = ['HttpOnly', 'XSS', 'CSRF', 'SQL Injection', 'Security', 'امنیت', 'کوکی', 'جلسه', 'حمله', 'فیشینگ', 'OWASP'];

        const content = document.getElementById('detail-content');
        if (!content) return;

        // پیمایش در کل کلمات کلیدی
        keywords.forEach(keyword => {
            // ایجاد عبارت باقاعده برای پیدا کردن کلمات کلیدی
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

            // پیدا کردن و هایلایت کردن کلمات کلیدی در محتوا
            // فقط در پاراگراف‌ها و لیست‌ها جستجو می‌کنیم، نه در کدها یا تگ‌های دیگر
            content.querySelectorAll('p, li').forEach(el => {
                if (!el.querySelector('code, pre, mark')) {
                    el.innerHTML = el.innerHTML.replace(regex, '<mark>$1</mark>');
                }
            });
        });

        // بهبود نمایش منابع و رفرنس‌ها
        const references = content.querySelectorAll('h2, h3, h4').forEach(heading => {
            if (heading.textContent.includes('منابع') || 
                heading.textContent.includes('رفرنس') || 
                heading.textContent.includes('مراجع')) {

                // بخش منابع را پیدا کردیم
                const refSection = heading.nextElementSibling;
                if (refSection && (refSection.tagName === 'UL' || refSection.tagName === 'OL')) {
                    // تغییر استایل لیست منابع
                    refSection.className = 'references-list';

                    // بهبود نمایش آیتم‌های منابع
                    Array.from(refSection.children).forEach((item, index) => {
                        item.className = 'reference-item';

                        // اضافه کردن شماره به ابتدای هر منبع
                        const itemContent = item.innerHTML;
                        item.innerHTML = `<span class="reference-number">${index + 1}</span>${itemContent}`;

                        // تبدیل لینک‌ها به دکمه‌های زیبا
                        const links = item.querySelectorAll('a');
                        links.forEach(link => {
                            link.className = 'reference-link';
                            link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> ${link.textContent}`;
                        });
                    });
                }
            }
        });
    },

    // نمایش پیام خطا
    showError: function(message) {
        const list = document.getElementById('post-list');
        list.innerHTML = `<div class="post error-message"><p>${message}</p></div>`;
    }
};

// ابزارهای امنیتی
const SecurityUtils = {
    // تنظیم کوکی‌های امن
    setCookie: function(name, value, days) {
        try {
            const secure = location.protocol === 'https:' ? '; Secure' : '';
            const expires = days ? 
                `; expires=${new Date(Date.now() + days * 86400000).toUTCString()}` : '';
            const httponly = '; HttpOnly';

            document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Strict${secure}${httponly}`;
        } catch (e) {
            console.error('خطا در ذخیره کوکی:', e);
        }
    },

    // دریافت کوکی
    getCookie: function(name) {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        } catch (e) {
            console.error('خطا در خواندن کوکی:', e);
            return null;
        }
    },

    // تمیز کردن HTML
    sanitizeHTML: function(html) {
        // در واقعیت باید از کتابخانه‌های تخصصی استفاده شود
        return html;
    },

    // ذخیره اطلاعات جلسه کاربر
    saveUserSession: function() {
        // پیاده‌سازی منطق ذخیره‌سازی اطلاعات جلسه کاربر
        // مثلاً با استفاده از localStorage یا یک فراخوانی به سرور
        // ...
    }
};

// مدیریت رویدادها
const EventManager = {
    init: function() {
        // رویداد دکمه جستجو
        document.getElementById('search-btn').addEventListener('click', () => {
            const searchTerm = document.getElementById('search-input').value;
            SearchManager.performSearch(searchTerm);
        });

        // رویداد کلید Enter در فیلد جستجو
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = e.target.value;
                SearchManager.performSearch(searchTerm);
                e.preventDefault();
            }
        });

        // نمایش پیشنهادات جستجو هنگام تایپ
        const searchInput = document.getElementById('search-input');

        // ایجاد کانتینر پیشنهادات
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'search-suggestions';
        suggestionsContainer.className = 'search-suggestions-dropdown';
        suggestionsContainer.style.display = 'none';

        // اضافه کردن به DOM
        const searchContainer = document.querySelector('.search-container');
        searchContainer.appendChild(suggestionsContainer);

        // رویداد تایپ برای نمایش پیشنهادات
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            if (query.length >= 2) {
                // فیلتر کردن کلمات کلیدی مرتبط با متن تایپ شده
                const filteredSuggestions = SearchManager.suggestedKeywords.filter(
                    keyword => keyword.toLowerCase().includes(query.toLowerCase())
                );

                if (filteredSuggestions.length > 0) {
                    suggestionsContainer.innerHTML = '';

                    filteredSuggestions.forEach(suggestion => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'suggestion-item';
                        suggestionItem.textContent = suggestion;

                        suggestionItem.addEventListener('click', () => {
                            searchInput.value = suggestion;
                            suggestionsContainer.style.display = 'none';
                            SearchManager.performSearch(suggestion);
                        });

                        suggestionsContainer.appendChild(suggestionItem);
                    });

                    suggestionsContainer.style.display = 'block';
                } else {
                    suggestionsContainer.style.display = 'none';
                }
            } else {
                suggestionsContainer.style.display = 'none';
            }
        });

        // مخفی کردن پیشنهادات با کلیک خارج از کادر
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });

        // رویداد دکمه بازگشت در صفحه جزئیات
        document.getElementById('back-btn').addEventListener('click', () => {
            const detailElement = document.getElementById('post-detail');
            detailElement.hidden = true;
            detailElement.classList.remove('fade-in');

            if (DataManager.isSearchActive) {
                document.getElementById('search-results').hidden = false;
            } else {
                document.getElementById('post-list').hidden = false;
                document.getElementById('pagination').hidden = false;
            }

            history.back();
        });

        // رویداد دکمه بازگشت در نتایج جستجو
        document.getElementById('back-from-search').addEventListener('click', () => {
            SearchManager.exitSearch();
        });

        // منوی ناوبری حذف شده است

        // مدیریت تاریخچه مرورگر
        window.addEventListener('popstate', (e) => {
            if (document.querySelector('#post-detail:not([hidden])')) {
                document.getElementById('post-detail').hidden = true;
                document.getElementById('post-detail').classList.remove('fade-in');

                if (DataManager.isSearchActive) {
                    document.getElementById('search-results').hidden = false;
                } else {
                    document.getElementById('post-list').hidden = false;
                    document.getElementById('pagination').hidden = false;
                }
            } else if (DataManager.isSearchActive && e.state === null) {
                SearchManager.exitSearch();
            } else if (e.state && e.state.page) {
                DataManager.currentPage = e.state.page;
                UI.renderList();
                UI.renderPagination();
            }
        });

        // افزودن قابلیت تم تاریک/روشن
        this.setupThemeToggle();

        // بارگذاری مجدد محتوا با سوایپ به پایین (Pull to refresh)
        this.setupPullToRefresh();
    },

    // تنظیم قابلیت تم تاریک/روشن
    setupThemeToggle: function() {
        // موقتاً غیرفعال شده - دکمه تم ایجاد نمی‌شود
        // بررسی تم ذخیره شده (ابتدا از کوکی، سپس از localStorage)
        const savedTheme = SecurityUtils.getCookie('theme') || localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-theme');
        }

        // افزودن استایل‌های مورد نیاز برای تم تاریک
        this.addDarkThemeStyles();
    },

    // افزودن استایل‌های تم تاریک و بهبود‌های بصری
    addDarkThemeStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            .dark-theme {
                --text-color: #e2e8f0;
                --bg-color: #121212;
                --accent-color: #0ea5e9;
                --hover-color: #0284c7;
                --muted-color: #94a3b8;
                --border-color: #334155;
                --light-bg: #1e293b;
                --card-shadow: 0 4px 12px -1px rgba(0, 0, 0, 0.6), 0 2px 6px -1px rgba(0, 0, 0, 0.4);
                --highlight-color: #38bdf8;
                --code-bg: #0f172a;
                --card-bg: #1e1e1e;
                --header-bg: rgba(18, 18, 18, 0.95);
                --footer-bg: #0f172a;
                --search-bg: #1e1e1e;
                --tooltip-bg: #374151;
                --mark-bg: rgba(14, 165, 233, 0.2);
                --share-btn-bg: #27272a;
                --share-btn-hover: #3f3f46;
            }

            .dark-theme .post,
            .dark-theme .post-detail {
                background-color: var(--card-bg);
                border: 1px solid var(--border-color);
            }

            .dark-theme .site-header {
                border-bottom-color: var(--border-color);
                background-color: var(--header-bg);
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            }

            .dark-theme .site-footer {
                border-top-color: var(--border-color);
                background-color: var(--footer-bg);
            }

            .dark-theme .pagination a {
                background-color: var(--card-bg);
                border: 1px solid var(--border-color);
            }

            .dark-theme .pagination a:hover {
                background-color: var(--accent-color);
                border-color: var(--accent-color);
            }

            .dark-theme .search-container input {
                background-color: var(--search-bg);
                border-color: var(--border-color);
                color: var(--text-color);
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
            }

            .dark-theme .search-container input:focus {
                border-color: var(--accent-color);
                box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25), inset 0 1px 3px rgba(0, 0, 0, 0.3);
            }

            .dark-theme .post-content pre {
                background-color: var(--code-bg);
                border-color: var(--border-color);
                color: #e2e8f0;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
            }

            .dark-theme .post-content code {
                background-color: rgba(255, 255, 255, 0.08);
                color: #93c5fd;
            }

            .dark-theme mark, 
            .dark-theme .search-term-highlight {
                background-color: var(--mark-bg);
                color: #fff;
                border-radius: 2px;
            }

            .dark-theme .button {
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }

            .dark-theme .button:hover {
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
            }

            .dark-theme .theme-toggle .sun-icon {
                display: none;
            }

            .dark-theme .theme-toggle .moon-icon {
                display: block;
            }

            .dark-theme .post-content img {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                border: 1px solid var(--border-color);
            }

            .dark-theme .copy-code-button {
                background-color: var(--accent-color);
            }

            .dark-theme .suggestion-tag {
                background-color: var(--light-bg);
                border-color: var(--border-color);
            }

            .dark-theme .suggestion-tag:hover {
                background-color: var(--accent-color);
            }

            .dark-theme .share-box {
                background-color: var(--light-bg);
                border-color: var(--border-color);
            }

            .dark-theme .share-btn {
                background-color: var(--share-btn-bg);
                color: var(--text-color);
                border-color: var(--border-color);
            }

            .dark-theme .share-btn:hover {
                background-color: var(--share-btn-hover);
            }

            .dark-theme .references-list {
                background-color: var(--light-bg);
                border-color: var(--border-color);
            }

            .dark-theme .reference-number {
                background-color: var(--accent-color);
            }

            .dark-theme .reference-link {
                color: var(--accent-color);
                border-color: var(--border-color);
            }

            /* استایل‌های عمومی */
            .theme-toggle .sun-icon {
                display: block;
            }

            .theme-toggle .moon-icon {
                display: none;
            }

            .theme-toggle {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background-color: var(--light-bg);
                border: 1px solid var(--border-color);
                cursor: pointer;
                color: var(--text-color);
                margin-right: 1rem;
                padding: 0.5rem 0.8rem;
                border-radius: 2rem;
                transition: all 0.2s ease;
                font-size: 0.85rem;
                font-weight: 500;
            }

            .theme-toggle-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background-color: var(--accent-color);
                color: white;
                border-radius: 50%;
                padding: 0.2rem;
            }

            .theme-toggle:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }

            .theme-toggle:active {
                transform: translateY(0);
            }

            .image-viewer {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease;
                backdrop-filter: blur(5px);
            }

            .image-viewer img {
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
                border-radius: 3px;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
                animation: zoomIn 0.3s ease;
            }

            @keyframes zoomIn {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            .image-viewer .close-button {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 2rem;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .image-viewer .close-button:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            .copy-code-button {
                position: absolute;
                top: 5px;
                right: 5px;
                background-color: var(--accent-color);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
                z-index: 5;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .copy-code-button:hover {
                opacity: 1;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }

            .lazy-image {
                transition: opacity 0.3s;
            }

            .error-message {
                color: #e53e3e;
                font-weight: 500;
            }

            /* استایل برای اشتراک‌گذاری */
            .share-box {
                background-color: var(--light-bg);
                border-radius: 0.8rem;
                padding: 1.5rem;
                margin-top: 3rem;
                box-shadow: 0 4px10px rgba(0, 0, 0, 0.05);
                border: 1px solid var(--border-color);
            }

            .share-title {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1.2rem;
                font-weight: 600;
                color: var(--accent-color);
            }

            .share-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 0.7rem;
            }

            .share-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.7rem 1rem;
                border-radius: 2rem;
                font-size: 0.9rem;
                transition: all 0.3s ease;
                cursor: pointer;
                background-color: white;
                border: 1px solid var(--border-color);
                color: var(--text-color);
                text-decoration: none;
                flex: 1;
                min-width: 120px;
                justify-content: center;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }

            .share-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 12px rgba(0, 0, 0, 0.1);
            }

            .copy-link {
                background-color: #f5f5f5;
                color: #333;
            }

            .copied .copy-link span {
                color: #10b981;
            }

            .copied .copy-link {
                background-color: #e2f2e9;
            }


            .telegram-share {
                background-color: #0088cc;
                color: white;
                border-color: #0088cc;
            }

            .twitter-share {
                background-color: #1da1f2;
                color: white;
                border-color: #1da1f2;
            }

            .whatsapp-share {
                background-color: #25d366;
                color: white;
                border-color: #25d366;
            }

            .linkedin-share {
                background-color: #0077b5;
                color: white;
                border-color: #0077b5;
            }

            /* استایل برای منابع */
            .references-list {
                background-color: #f8fafc;
                border-radius: 0.8rem;
                padding: 1.5rem 2rem;
                margin: 2rem 0;
                border: 1px solid var(--border-color);
                list-style-type: none;
            }

            .reference-item {
                padding: 0.8rem 0;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: flex-start;
                gap: 1rem;
            }

            .reference-item:last-child {
                border-bottom: none;
            }

            .reference-number {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background-color: var(--accent-color);
                color: white;
                border-radius: 50%;
                font-size: 0.8rem;
                font-weight: bold;
                flex-shrink: 0;
            }

            .reference-link {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                margin-top: 0.5rem;
                padding: 0.4rem 0.8rem;
                background-color: rgba(0, 0, 0, 0.03);
                border-radius: 2rem;
                border: 1px solid var(--border-color);
                color: var(--accent-color);
                text-decoration: none;
                font-size: 0.85rem;
                transition: all 0.2s ease;
            }

            .reference-link:hover {
                background-color: var(--accent-color);
                color: white;
                border-color: var(--accent-color);
                transform: translateY(-2px);
            }

            @media (max-width: 700px) {
                .share-buttons {
                    flex-direction: column;
                }

                .share-btn {
                    width: 100%;
                    flex: none;
                }
            }
            .dana-font {
                font-family: 'Dana', 'DanaFaNum', sans-serif;
            }
        `;

        document.head.appendChild(style);
    },

    // تنظیم قابلیت Pull to refresh
    setupPullToRefresh: function() {
        let touchStartY = 0;
        let touchEndY = 0;
        const minSwipeDistance = 100;

        // ایجاد المان نشانگر بارگذاری
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'refresh-indicator';
        refreshIndicator.innerHTML = 'برای بارگذاری مجدد، به پایین بکشید...';
        refreshIndicator.style.display = 'none';
        document.body.insertBefore(refreshIndicator, document.body.firstChild);

        // اضافه کردن استایل
        const style = document.createElement('style');
        style.textContent = `
            .refresh-indicator {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background-color: var(--accent-color);
                color: white;
                text-align: center;
                padding: 10px;
                z-index: 1000;
                transform: translateY(-100%);
                transition: transform 0.3s;
            }

            .refresh-indicator.visible {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);

        // رویدادهای لمسی
        document.addEventListener('touchstart', e => {
            touchStartY = e.touches[0].clientY;
        }, {passive: true});

        document.addEventListener('touchmove', e => {
            touchEndY = e.touches[0].clientY;

            // اگر در بالای صفحه هستیم و به پایین می‌کشیم
            if (window.scrollY <= 0 && touchEndY > touchStartY) {
                const distance = touchEndY - touchStartY;
                if (distance > minSwipeDistance / 2) {
                    refreshIndicator.style.display = 'block';
                    refreshIndicator.classList.add('visible');
                }
            }
        }, {passive: true});

        document.addEventListener('touchend', e => {
            if (refreshIndicator.classList.contains('visible')) {
                refreshIndicator.classList.remove('visible');

                const distance = touchEndY - touchStartY;
                if (distance > minSwipeDistance) {
                    // انجام عملیات بارگذاری مجدد
                    refreshIndicator.innerHTML = 'در حال بارگذاری...';

                    // بارگذاری مجدد مقالات
                    DataManager.loadPosts().then(() => {
                        // پنهان کردن نشانگر بارگذاری
                        setTimeout(() => {
                            refreshIndicator.style.display = 'none';
                        }, 500);
                    });
                } else {
                    // پنهان کردن نشانگر
                    setTimeout(() => {
                        refreshIndicator.style.display = 'none';
                    }, 300);
                }
            }
        }, {passive: true});
    }
};

// مدیریت تجربه کاربری
const UXManager = {
    // مدیریت لود تنبل تصاویر با بهینه‌سازی سئو
    setupLazyLoading: function() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const dataSrc = img.getAttribute('data-src');

                        if (dataSrc) {
                            img.src = dataSrc;
                            img.removeAttribute('data-src');
                        }

                        // بررسی و بهبود Alt برای سئو
                        this.optimizeImageAlt(img);

                        img.classList.add('loaded');
                        imageObserver.unobserve(img);
                    }
                });
            });

            // انتخاب همه تصاویر با ویژگی data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback برای مرورگرهای قدیمی
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');

                // بررسی و بهبود Alt برای سئو
                this.optimizeImageAlt(img);
            });
        }

        // بهینه‌سازی عمومی تصاویر برای سئو
        document.querySelectorAll('img').forEach(img => {
            // اضافه کردن ویژگی loading=lazy برای تصاویر
            if (!img.hasAttribute('loading')) {
                img.loading = 'lazy';
            }

            // اطمینان از وجود alt
            this.optimizeImageAlt(img);

            // اضافه کردن ابعاد تصویر برای کاهش CLS
            if (!img.hasAttribute('width') && !img.hasAttribute('height') && img.complete) {
                if (img.naturalWidth > 0) {
                    img.setAttribute('width', img.naturalWidth);
                    img.setAttribute('height', img.naturalHeight);
                }
            }
        });
    },

    // بهینه‌سازی متن جایگزین تصاویر برای سئو
    optimizeImageAlt: function(img) {
        // اگر alt وجود ندارد یا خالی است
        if (!img.alt || img.alt === '') {
            // سعی می‌کنیم از نام فایل یا متن اطراف تصویر برای alt استفاده کنیم
            let altText = '';

            // بررسی عنصر والد
            const parent = img.parentElement;
            if (parent) {
                if (parent.tagName === 'FIGURE' && parent.querySelector('figcaption')) {
                    // استفاده از متن figcaption
                    altText = parent.querySelector('figcaption').textContent;
                } else if (parent.previousElementSibling && 
                           ['H1', 'H2', 'H3', 'H4'].includes(parent.previousElementSibling.tagName)) {
                    // استفاده از متن عنوان قبل از تصویر
                    altText = parent.previousElementSibling.textContent;
                } else {
                    // استفاده از نام فایل به عنوان آخرین گزینه
                    try {
                        const imgSrc = img.src.split('/').pop();
                        altText = imgSrc.split('.')[0].replace(/[-_]/g, ' ');
                        // کاپیتالایز کردن
                        altText = altText.charAt(0).toUpperCase() + altText.slice(1);
                    } catch(e) {
                        altText = 'تصویر مرتبط با امنیت وب';
                    }
                }
            } else {
                altText = 'تصویر مرتبط با امنیت وب';
            }

            img.alt = altText;
        }
    },

    // مدیریت اسکرول به بالا
    setupScrollToTop: function() {
        // ایجاد دکمه اسکرول به بالا
        const scrollButton = document.createElement('button');
        scrollButton.className = 'scroll-to-top';
        scrollButton.setAttribute('aria-label', 'اسکرول به بالای صفحه');
        scrollButton.innerHTML = '↑';
        document.body.appendChild(scrollButton);

        // اضافه کردن استایل
        const style = document.createElement('style');
        style.textContent = `
            .scroll-to-top {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: var(--accent-color);
                color: white;
                border: none;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                z-index: 100;
            }

            .scroll-to-top.visible {
                opacity: 1;
                visibility: visible;
            }

            .scroll-to-top:hover {
                background-color: var(--hover-color);
            }
        `;
        document.head.appendChild(style);

        // رویداد اسکرول
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        });

        // رویداد کلیک
        scrollButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
};

// راه‌اندازی برنامه
document.addEventListener('DOMContentLoaded', async () => {
    // بارگذاری مقالات
    const postsLoaded = await DataManager.loadPosts();

    if (postsLoaded) {
        // راه‌اندازی مدیریت رویدادها
        EventManager.init();

        // راه‌اندازی قابلیت‌های تجربه کاربری
        UXManager.setupLazyLoading();
        UXManager.setupScrollToTop();
    }
});