
/**
 * ابزارهای کمکی سئو برای وبلاگ امنیت وب
 * این فایل شامل توابعی برای بهبود سئو و داده‌های ساختاریافته است
 */

// آرایه‌ای از کلمات کلیدی مهم برای هایلایت خودکار
const SEO_KEYWORDS = [
    'HttpOnly', 'XSS', 'CSRF', 'SQL Injection', 'API Security',
    'امنیت وب', 'حملات سایبری', 'فیشینگ', 'OWASP', 'کوکی امن',
    'امنیت API', 'احراز هویت', 'توکن امنیتی', 'حملات فیشینگ',
    'امنیت اطلاعات', 'داده‌های حساس', 'رمزنگاری', 'پروتکل امن'
];

/**
 * بهینه‌سازی عنوان مقاله برای سئو
 * @param {string} title - عنوان اصلی مقاله
 * @returns {string} - عنوان بهینه شده
 */
function optimizeTitle(title) {
    // اگر عنوان خیلی کوتاه است، کلمه کلیدی برند را اضافه می‌کنیم
    if (title.length < 30) {
        return `${title} | راهنمای امنیت وب`;
    }
    // اگر عنوان خیلی بلند است، آن را کوتاه می‌کنیم
    if (title.length > 60) {
        return title.substring(0, 57) + '...';
    }
    return title;
}

/**
 * بهینه‌سازی توضیحات متا برای سئو
 * @param {string} description - توضیحات اولیه
 * @returns {string} - توضیحات بهینه شده
 */
function optimizeDescription(description) {
    // اطمینان از طول مناسب توضیحات متا
    if (description.length < 50) {
        return description + ' - مقاله‌ای جامع در زمینه امنیت وب و حفاظت از اطلاعات.';
    }
    if (description.length > 160) {
        return description.substring(0, 157) + '...';
    }
    return description;
}

/**
 * اضافه کردن داده‌های ساختاریافته به مقاله
 * @param {Object} post - اطلاعات مقاله
 * @param {string} baseUrl - آدرس پایه سایت
 */
function addArticleStructuredData(post, baseUrl) {
    // حذف اسکیمای قبلی اگر وجود دارد
    const existingSchema = document.getElementById('article-schema');
    if (existingSchema) {
        existingSchema.remove();
    }
    
    // ایجاد اسکیمای جدید
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "author": {
            "@type": "Person",
            "name": post.author
        },
        "datePublished": post.date,
        "publisher": {
            "@type": "Organization",
            "name": "وبلاگ امنیت وب",
            "logo": {
                "@type": "ImageObject",
                "url": baseUrl + "/logo.PNG"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": baseUrl + "/article.html?id=" + post.id
        }
    };
    
    // اضافه کردن کلمات کلیدی اگر وجود دارند
    if (post.tags && Array.isArray(post.tags)) {
        articleSchema.keywords = post.tags.join(", ");
    }
    
    // اضافه کردن تصویر اگر وجود داشته باشد
    if (post.image) {
        articleSchema.image = baseUrl + "/" + post.image;
    }
    
    // ایجاد تگ اسکریپت و اضافه کردن به head
    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);
}

/**
 * افزودن breadcrumb به صفحه (مسیر ناوبری)
 * @param {string} pageTitle - عنوان صفحه فعلی
 * @param {string} id - شناسه مقاله (اختیاری)
 */
function addBreadcrumbStructuredData(pageTitle, id = null) {
    // حذف breadcrumb قبلی اگر وجود دارد
    const existingBreadcrumb = document.getElementById('breadcrumb-schema');
    if (existingBreadcrumb) {
        existingBreadcrumb.remove();
    }
    
    const baseUrl = window.location.origin;
    
    // ایجاد اسکیمای breadcrumb
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "صفحه اصلی",
                "item": baseUrl
            }
        ]
    };
    
    // اگر در صفحه مقاله هستیم
    if (id) {
        breadcrumbSchema.itemListElement.push({
            "@type": "ListItem",
            "position": 2,
            "name": "مقالات",
            "item": baseUrl + "/#page=1"
        });
        
        breadcrumbSchema.itemListElement.push({
            "@type": "ListItem",
            "position": 3,
            "name": pageTitle,
            "item": baseUrl + "/article.html?id=" + id
        });
    } 
    // اگر در صفحات دیگر هستیم
    else if (pageTitle !== "صفحه اصلی") {
        breadcrumbSchema.itemListElement.push({
            "@type": "ListItem",
            "position": 2,
            "name": pageTitle,
            "item": window.location.href
        });
    }
    
    // ایجاد تگ اسکریپت و اضافه کردن به head
    const script = document.createElement('script');
    script.id = 'breadcrumb-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(script);
}

/**
 * بهینه‌سازی تصاویر برای سئو
 */
function optimizeImagesForSEO() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        // اطمینان از وجود alt برای همه تصاویر
        if (!img.alt || img.alt === '') {
            // سعی می‌کنیم از متن اطراف تصویر برای alt استفاده کنیم
            let altText = '';
            
            // بررسی عنصر والد
            const parent = img.parentElement;
            if (parent.tagName === 'FIGURE' && parent.querySelector('figcaption')) {
                altText = parent.querySelector('figcaption').textContent;
            } else if (parent.previousElementSibling && 
                      (parent.previousElementSibling.tagName === 'H1' || 
                       parent.previousElementSibling.tagName === 'H2' || 
                       parent.previousElementSibling.tagName === 'H3')) {
                altText = parent.previousElementSibling.textContent;
            } else {
                // از نام فایل تصویر استفاده می‌کنیم
                const imgSrc = img.src.split('/').pop();
                altText = imgSrc.split('.')[0].replace(/[-_]/g, ' ');
            }
            
            img.alt = altText;
        }
        
        // اضافه کردن ویژگی loading=lazy برای تصاویر
        if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }
        
        // اضافه کردن ابعاد تصویر برای کاهش CLS
        if (!img.hasAttribute('width') && !img.hasAttribute('height') && img.complete) {
            img.setAttribute('width', img.naturalWidth);
            img.setAttribute('height', img.naturalHeight);
        }
    });
}

// صادر کردن توابع برای استفاده در صفحات مختلف
export {
    SEO_KEYWORDS,
    optimizeTitle,
    optimizeDescription,
    addArticleStructuredData,
    addBreadcrumbStructuredData,
    optimizeImagesForSEO
};
