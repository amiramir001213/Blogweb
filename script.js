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

            const data = await response.json();
            this.posts = data;

            // بررسی پارامترهای URL
            this.checkUrlParams();

            return true;
        } catch (error) {
            console.error('خطا در بارگذاری مقالات:', error);
            UI.showError('متأسفانه در بارگذاری مقالات مشکلی پیش آمد. لطفا صفحه را مجدداً بارگذاری کنید.');
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

        // اگر مقاله تصویر داشت، آن را نمایش می‌دهیم
        if (post.image) {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'post-thumbnail';

            const image = document.createElement('img');
            image.src = post.image;
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
            // نمایش پیام عدم یافتن نتیجه به همراه پیشنهادات جستجو
            const noResultsEl = document.createElement('div');
            noResultsEl.className = 'post no-results';

            const noResultsMsg = document.createElement('p');
            noResultsMsg.textContent = 'نتیجه‌ای یافت نشد!';

            const suggestionsTitle = document.createElement('p');
            suggestionsTitle.className = 'suggestions-title';
            suggestionsTitle.textContent = 'جستجوهای پیشنهادی:';

            const suggestionsList = document.createElement('div');
            suggestionsList.className = 'search-suggestions';

            // نمایش پیشنهادات جستجو
            this.suggestedKeywords.forEach(keyword => {
                const suggestionBtn = document.createElement('button');
                suggestionBtn.className = 'suggestion-tag';
                suggestionBtn.textContent = keyword;
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
        this.suggestedKeywords
            .filter(keyword => !keyword.toLowerCase().includes(query.toLowerCase()) && 
                               !query.toLowerCase().includes(keyword.toLowerCase()))
            .slice(0, 5)
            .forEach(keyword => {
                const relatedTag = document.createElement('button');
                relatedTag.className = 'suggestion-tag';
                relatedTag.textContent = keyword;
                relatedTag.addEventListener('click', () => {
                    document.getElementById('search-input').value = keyword;
                    this.performSearch(keyword);
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

        // ایجاد URL برای صفحه جدید مقاله
        let articleURL = `article.html?id=${id}`;

        // بررسی می‌کنیم آیا article.html وجود دارد یا نه
        // اگر وجود نداشت، از همان روش قبلی استفاده می‌کنیم
        fetch('article.html', { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    // article.html وجود دارد، به صفحه جدید هدایت می‌کنیم
                    window.location.href = articleURL;
                } else {
                    // article.html وجود ندارد، از روش قبلی استفاده می‌کنیم
                    this.showDetailInline(id);
                }
            })
            .catch(() => {
                // در صورت خطا هم از روش قبلی استفاده می‌کنیم
                this.showDetailInline(id);
            });
    },

    // نمایش جزئیات مقاله در همان صفحه (روش قبلی)
    showDetailInline: function(id) {
        const post = DataManager.getPostById(id);
        if (!post) return;

        document.getElementById('post-list').hidden = true;
        document.getElementById('pagination').hidden = true;
        document.getElementById('search-results').hidden = true;

        const detailElement = document.getElementById('post-detail');
        detailElement.hidden = false;
        detailElement.classList.add('fade-in');

        // تنظیم عنوان و متادیتا
        detailElement.querySelector('#detail-title').textContent = post.title;
        const date = post.date || 'تاریخ: ۷ اردیبهشت ۱۴۰۴'; // Modified line
        detailElement.querySelector('#detail-meta').textContent = `تاریخ: ${date} | نویسنده: ${post.author}`;

        // پاک کردن محتوای قبلی
        const contentContainer = detailElement.querySelector('#detail-content');
        contentContainer.innerHTML = '';

        // اضافه کردن تصویر شاخص اگر وجود داشته باشد
        if (post.image) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'post-featured-image';

            const img = document.createElement('img');
            img.src = post.image;
            img.alt = post.title;
            img.loading = 'eager'; // تصویر اصلی را سریع بارگذاری کن

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

        // ایجاد باکس اشتراک‌گذاری
        const shareBox = document.createElement('div');
        shareBox.className = 'share-box';

        const shareText = document.createElement('p');
        shareText.textContent = 'این مقاله را به اشتراک بگذارید:';

        const shareBtns = document.createElement('div');
        shareBtns.className = 'share-buttons';

        // دکمه کپی لینک
        const copyLink = document.createElement('button');
        copyLink.className = 'share-btn copy-link';
        copyLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span>کپی لینک</span>';

        copyLink.addEventListener('click', () => {
            const url = window.location.origin + window.location.pathname + '#' + post.id;
            navigator.clipboard.writeText(url).then(() => {
                copyLink.querySelector('span').textContent = 'کپی شد!';
                setTimeout(() => {
                    copyLink.querySelector('span').textContent = 'کپی لینک';
                }, 2000);
            });
        });

        // دکمه تلگرام
        const telegramShare = document.createElement('a');
        telegramShare.className = 'share-btn telegram-share';
        telegramShare.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.0717 3.57277C21.8063 3.34026 21.4482 3.25452 21.1168 3.34026L2.83748 9.34026C2.39498 9.46725 2.09123 9.83027 2.01873 10.2866C1.95061 10.7428 2.13436 11.1764 2.50311 11.4153L6.57886 14.2053V19.9991C6.57886 20.4553 6.82936 20.8678 7.22561 21.0928C7.4186 21.1991 7.63873 21.2491 7.85323 21.2491C8.0771 21.2491 8.29685 21.1928 8.4961 21.0928L12.5719 18.9303L15.5781 21.5553C15.8622 21.8116 16.2396 21.9491 16.6296 21.9491C16.7156 21.9491 16.8081 21.9428 16.8969 21.9241C17.3781 21.8178 17.7781 21.5053 17.9656 21.0616L22.2781 4.56152C22.4031 4.23027 22.3281 3.8053 22.0717 3.57277ZM16.5594 6.18652L8.6156 13.4678L4.97686 10.9678L16.5594 6.18652ZM8.57611 19.2491V15.6928L10.7219 17.6241L8.57611 19.2491ZM16.6296 19.9491L9.41735 13.5116L20.6343 5.13027L16.6296 19.9491Z" fill="currentColor"/></svg><span>تلگرام</span>';
        telegramShare.href = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`;
        telegramShare.target = '_blank';
        telegramShare.rel = 'noopener noreferrer';

        shareBtns.appendChild(copyLink);
        shareBtns.appendChild(telegramShare);

        shareBox.appendChild(shareText);
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
                        copyButton.style.backgroundColor = '#10b981'; // رنگ سبز موفقیت
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

    // هایلایت کردن کلمات کلیدی
    highlightKeywords: function() {
        // لیستی از کلمات کلیدی
        const keywords = ['HttpOnly', 'XSS', 'CSRF', 'Security', 'امنیت', 'کوکی', 'جلسه', 'حمله'];

        const content = document.getElementById('detail-content');
        if (!content) return;

        // پیمایش در کل کلمات کلیدی
        keywords.forEach(keyword => {
            // ایجاد عبارت باقاعده برای پیدا کردن کلمات کلیدی
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

            // پیدا کردن و هایلایت کردن کلمات کلیدی در محتوا
            // فقط در پاراگراف‌ها و لیست‌ها جستجو می‌کنیم، نه در کدها یا تگ‌های دیگر
            content.querySelectorAll('p, li').forEach(el => {
                if (!el.querySelector('code, pre, mark')) { // اگر شامل کد یا علامت‌گذاری قبلی نباشد
                    el.innerHTML = el.innerHTML.replace(regex, '<mark>$1</mark>');
                }
            });
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

            document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Strict${secure}`;
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
                document.getElementById('post-list').hidden = false;                document.getElementById('pagination').hidden = false;
            }

            history.back();
        });

        // رویداد دکمه بازگشت در نتایج جستجو
        document.getElementById('back-from-search').addEventListener('click', () => {
            SearchManager.exitSearch();
        });

        // رویداد منوی موبایل
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mainNav = document.getElementById('main-nav');

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                mainNav.classList.toggle('active');
            });
        }

        // بستن منو با کلیک خارج از آن
        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('active') && 
                !mainNav.contains(e.target) && 
                e.target !== mobileMenuToggle && 
                !mobileMenuToggle.contains(e.target)) {
                mainNav.classList.remove('active');
            }
        });

        // تنظیم مجدد منو در تغییر اندازه صفحه
        window.addEventListener('resize', () => {
            if (window.innerWidth > 700 && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
            }
        });

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
        // افزودن دکمه تغییر تم در فوتر
        const footerInfo = document.querySelector('.footer-info');

        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.setAttribute('aria-label', 'تغییر تم روشن/تاریک');
        themeToggle.innerHTML = `
            <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 1V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 21V23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12H23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79C20.8427 14.4922 20.2039 16.1144 19.1582 17.4668C18.1126 18.8192 16.7025 19.8458 15.0957 20.4265C13.4889 21.0073 11.7467 21.1181 10.0797 20.7461C8.41267 20.3741 6.88338 19.5345 5.67418 18.3254C4.46497 17.1162 3.62545 15.5869 3.25349 13.9199C2.88153 12.2529 2.99227 10.5106 3.57303 8.90386C4.15378 7.29711 5.18035 5.88696 6.53278 4.84132C7.8852 3.79569 9.50739 3.15683 11.21 3C10.2134 4.34827 9.73385 6.00945 9.85853 7.68141C9.9832 9.35338 10.7038 10.9251 11.8894 12.1106C13.0749 13.2961 14.6466 14.0168 16.3186 14.1415C17.9906 14.2662 19.6517 13.7866 21 12.79Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        footerInfo.appendChild(themeToggle);

        // بررسی تم ذخیره شده
        const savedTheme = SecurityUtils.getCookie('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-theme');
        }

        // رویداد تغییر تم
        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-theme');

            // ذخیره تنظیمات تم
            const isDark = document.documentElement.classList.contains('dark-theme');
            SecurityUtils.setCookie('theme', isDark ? 'dark' : 'light', 365);
        });

        // افزودن استایل‌های مورد نیاز برای تم تاریک
        this.addDarkThemeStyles();
    },

    // افزودن استایل‌های تم تاریک
    addDarkThemeStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            .dark-theme {
                --text-color: #d1d5db;
                --bg-color: #1a1a1a;
                --accent-color: #2dd4bf;
                --hover-color: #14b8a6;
                --muted-color: #9ca3af;
                --border-color: #2d2d2d;
                --light-bg: #111827;
                --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
                --highlight-color: #38b2ac;
            }

            .dark-theme .post,
            .dark-theme .post-detail {
                background-color: #262626;
            }

            .dark-theme .site-header {
                border-bottom-color: #2d2d2d;
            }

            .dark-theme .site-footer {
                border-top-color: #2d2d2d;
            }

            .dark-theme .pagination a {
                background-color: #262626;
            }

            .dark-theme .search-container input {
                background-color: #262626;
                border-color: #2d2d2d;
                color: #d1d5db;
            }

            .dark-theme .post-content pre {
                background-color: #111827;
                border-color: #2d2d2d;
                color: #d1d5db;
            }

            .dark-theme .post-content code {
                background-color: rgba(255, 255, 255, 0.1);
            }

            .dark-theme .theme-toggle .sun-icon {
                display: none;
            }

            .dark-theme .theme-toggle .moon-icon {
                display: block;
            }

            .theme-toggle .sun-icon {
                display: block;
            }

            .theme-toggle .moon-icon {
                display: none;
            }

            .theme-toggle {
                background: transparent;
                border: none;
                cursor: pointer;
                color: var(--muted-color);
                margin-left: 1rem;
                padding: 0.3rem;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .theme-toggle:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }

            .dark-theme .theme-toggle:hover {
                background-color: rgba(255, 255, 255, 0.1);
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
            }

            .image-viewer img {
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
            }

            .image-viewer .close-button {
                position: absolute;
                top: 20px;
                right: 20px;
                background: none;
                border: none;
                color: white;
                font-size: 2rem;
                cursor: pointer;
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
            }

            .copy-code-button:hover {
                opacity: 1;
            }

            .lazy-image {
                transition: opacity 0.3s;
            }

            .error-message {
                color: #e53e3e;
                font-weight: 500;
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
    // مدیریت لود تنبل تصاویر
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
            });
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
                right: 20px;
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