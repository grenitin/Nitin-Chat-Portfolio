document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.cursor-dot');
    const follower = document.querySelector('.cursor-follower');
    
    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;

    // 1. Magnetic Cursor Engine
    if (cursor && follower) {
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        });

        const animateCursor = () => {
            followerX += (mouseX - followerX) * 0.12;
            followerY += (mouseY - followerY) * 0.12;
            
            follower.style.transform = `translate3d(${followerX - 20}px, ${followerY - 20}px, 0)`;
            
            requestAnimationFrame(animateCursor);
        };
        animateCursor();
    }

    // 2. Cursor Hover States
    if (follower) {
        const interactiveElements = document.querySelectorAll('a, button, .stat-card, .agent-card, .case-img');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                follower.style.width = '80px';
                follower.style.height = '80px';
                follower.style.transform = `translate3d(${followerX - 40}px, ${followerY - 40}px, 0)`;
                follower.style.backgroundColor = 'var(--accent-light)';
                follower.style.borderColor = 'var(--accent)';
            });
            el.addEventListener('mouseleave', () => {
                follower.style.width = '40px';
                follower.style.height = '40px';
                follower.style.backgroundColor = 'transparent';
                follower.style.borderColor = 'var(--accent)';
            });
        });
    }

    // 3. Reveal on Scroll (Intersection Observer)
    const revealOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, revealOptions);

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // 4. Smooth Parallax for Case Images
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        document.querySelectorAll('.case-img img').forEach(img => {
            const rect = img.parentElement.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const move = (rect.top - window.innerHeight / 2) * 0.1;
                img.style.transform = `translateY(${move}px) scale(1.1)`;
            }
        });
    });

    // 5. THEME SWITCHING & MOBILE MENU
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    const updateThemeIcon = (isDark) => {
        if (!themeToggle) return;
        const moonIcon = themeToggle.querySelector('.moon-icon');
        const sunIcon = themeToggle.querySelector('.sun-icon');
        if (moonIcon && sunIcon) {
            moonIcon.style.display = isDark ? 'none' : 'block';
            sunIcon.style.display = isDark ? 'block' : 'none';
        }
    };

    const savedTheme = localStorage.getItem('theme') || 'dark';

    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        body.classList.add('dark-mode');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark-mode');
        body.classList.remove('dark-mode');
        updateThemeIcon(false);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.add('theme-transition');
            document.documentElement.classList.add('theme-transition');
            
            // Force browser reflow
            void document.documentElement.offsetHeight;
            
            const isDark = body.classList.toggle('dark-mode');
            document.documentElement.classList.toggle('dark-mode');
            
            const theme = isDark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            setTimeout(() => {
                body.classList.remove('theme-transition');
                document.documentElement.classList.remove('theme-transition');
            }, 600);

            updateThemeIcon(isDark);
        });
    }

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });
    }

    // 6. Hero Text Slider Engine (Robust Edition)
    const initHeroSlider = () => {
        const sliderSlides = document.querySelectorAll('.hero-slider .slide');
        const sliderDots = document.querySelectorAll('.slider-dots .dot');
        const heroAsset = document.querySelector('.hero-3d-asset');
        
        if (sliderSlides.length === 0) return;

        const heroImages = [
            'assets/images/hero_lightbulb_final.png',
            'assets/images/ux_ai_trans.png',
            'assets/images/ux_enterprise_v2.png'
        ];

        let slideIdx = 0;
        let intervalId;

        const updateSlider = (index) => {
            sliderSlides.forEach(s => s.classList.remove('active'));
            sliderDots.forEach(d => d.classList.remove('active'));
            
            sliderSlides[index].classList.add('active');
            if (sliderDots[index]) sliderDots[index].classList.add('active');
            
            // Update Hero Asset - Disabled for single hero-image (nitin.png)
            /*
            if (heroAsset && heroImages[index]) {
                heroAsset.style.opacity = '0';
                setTimeout(() => {
                    heroAsset.style.backgroundImage = `url('${heroImages[index]}')`;
                    heroAsset.style.opacity = '1';
                }, 400);
            }
            */
            
            slideIdx = index;
        };

        const startAuto = () => {
            intervalId = setInterval(() => {
                let next = (slideIdx + 1) % sliderSlides.length;
                updateSlider(next);
            }, 5000); // 5 seconds
        };

        // Initialize first slide state
        updateSlider(0);
        startAuto();

        // Manual Navigation
        sliderDots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                clearInterval(intervalId);
                updateSlider(i);
                startAuto();
            });
        });
    };

    initHeroSlider();

    // 7. Journey Card Expansion Engine
    const initJourneyExpansion = () => {
        const journeyCards = document.querySelectorAll('.journey-card');
        if (journeyCards.length === 0) return;
        
        journeyCards.forEach(card => {
            const expandBtn = card.querySelector('.expand-btn');
            const details = card.querySelector('.journey-details');
            const header = card.querySelector('.journey-header');
            if (!expandBtn || !details || !header) return;
            
            const toggleExpand = (e) => {
                if (e) e.stopPropagation();
                
                const isMobile = window.innerWidth <= 768;
                
                if (isMobile) {
                    // Create a true body-level modal to break out of CSS transforms
                    let modal = document.querySelector('.mobile-journey-modal');
                    if (modal) modal.remove();
                    
                    modal = document.createElement('div');
                    modal.className = 'mobile-journey-modal';
                    
                    modal.innerHTML = `
                        <button class="mobile-close-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <div class="modal-content-wrapper">
                            <div class="journey-header" style="margin-bottom: 2rem !important; padding-right: 3rem; margin-top: 0 !important;">
                                ${header.innerHTML}
                            </div>
                            ${details.innerHTML}
                        </div>
                        <div class="modal-cta-bar">
                            <a href="https://www.linkedin.com/in/nitin-kr-205341b/" class="ds-btn ds-btn-secondary" target="_blank">My LinkedIn</a>
                            <a href="assets/Nitin_Kr_Resume.pdf" download class="ds-btn ds-btn-primary">My Resume</a>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    document.body.style.overflow = 'hidden'; // Lock background scroll
                    
                    // Handle scroll visibility for CTA bar
                    const contentWrapper = modal.querySelector('.modal-content-wrapper');
                    const ctaBar = modal.querySelector('.modal-cta-bar');
                    let scrollTimeout;

                    contentWrapper.addEventListener('scroll', () => {
                        ctaBar.classList.add('hidden');
                        clearTimeout(scrollTimeout);
                        scrollTimeout = setTimeout(() => {
                            ctaBar.classList.remove('hidden');
                        }, 150); // Show after 150ms of no scrolling
                    });

                    const closeModal = () => {
                        modal.classList.add('closing');
                        setTimeout(() => {
                            modal.remove();
                            document.body.style.overflow = '';
                        }, 300);
                    };
                    
                    const closeBtn = modal.querySelector('.mobile-close-btn');
                    closeBtn.addEventListener('click', closeModal);
                    
                } else {
                    // Desktop inline expansion
                    const isExpanded = card.classList.toggle('expanded');
                    expandBtn.textContent = isExpanded ? 'HIDE DETAILS' : 'VIEW DETAILS';
                }
            };

            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' && e.target !== expandBtn) return;
                toggleExpand(e);
            });
            
            expandBtn.addEventListener('click', toggleExpand);
        });
    };

    const initAccordionToggle = () => {
        // Handle both special accordion toggles and regular section headers
        const toggles = document.querySelectorAll('.accordion-toggle, .cs-section-header');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const section = toggle.closest('.cs-accordion-section, .cs-section');
                if (section) {
                    section.classList.toggle('expanded');
                }
            });
        });
    };

    function initBurgerMenu() {
        const burgerBtn = document.getElementById('burger-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        const menuClose = document.getElementById('menu-close');
        const menuLinks = document.querySelectorAll('.menu-link');

        if (!burgerBtn || !menuOverlay) return;

        burgerBtn.addEventListener('click', () => {
            const isActive = menuOverlay.classList.toggle('active');
            burgerBtn.classList.toggle('active');
            document.body.classList.toggle('menu-open');
            document.body.style.overflow = isActive ? 'hidden' : '';
            
            // Failsafe: Explicitly hide/show ALL hero actions to prevent CSS overlap issues
            document.querySelectorAll('.hero-actions, .modal-cta-bar').forEach(el => {
                el.style.setProperty('display', isActive ? 'none' : 'flex', 'important');
                el.style.setProperty('visibility', isActive ? 'hidden' : 'visible', 'important');
                el.style.setProperty('opacity', isActive ? '0' : '1', 'important');
            });
        });

        // Close menu when clicking outside (on the overlay background)
        menuOverlay.addEventListener('click', (e) => {
            if (e.target === menuOverlay) {
                closeMenu();
            }
        });

        const closeMenu = () => {
            burgerBtn.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
            document.body.style.overflow = '';
        };

        if (menuClose) {
            menuClose.addEventListener('click', closeMenu);
        }

        menuLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    initJourneyExpansion();
    initAccordionToggle();
    initBurgerMenu();
    initHeroVisibility();
});

// Mobile Hero CTA Visibility
function initHeroVisibility() {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 600) {
            document.body.classList.add('scrolled-past');
        } else {
            document.body.classList.remove('scrolled-past');
        }
    }, { passive: true });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initHeroVisibility();
});
