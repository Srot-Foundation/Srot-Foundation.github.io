const resolveBasePath = () => {
    const normalisedPath = window.location.pathname.replace(/\\/g, '/');
    return normalisedPath.includes('/pages/') ? '..' : '.';
};

const buildRoute = (basePath, route) => {
    if (!route) {
        return '#';
    }

    if (route.startsWith('http')) {
        return route;
    }

    return basePath === '.' ? route : `${basePath}/${route}`;
};

const applyRouteLinks = (root, basePath) => {
    if (!root) {
        return;
    }

    root.querySelectorAll('[data-route]').forEach(link => {
        const { route } = link.dataset;
        if (!route) {
            return;
        }

        link.setAttribute('href', buildRoute(basePath, route));
    });
};

const applyLogos = (root, basePath) => {
    if (!root) {
        return;
    }

    root.querySelectorAll('img[data-logo]').forEach(img => {
        img.src = `${basePath}/src/assets/logo.svg`;
    });
};

const applySocialIcons = (root, basePath) => {
    if (!root) {
        return;
    }

    const iconMap = {
        instagram: 'insta_icon.svg',
        linkedin: 'linkdin_icon.svg',
        twitter: 'twitter_icon.svg'
    };

    root.querySelectorAll('img[data-social-icon]').forEach(img => {
        const key = img.dataset.socialIcon;
        const asset = iconMap[key];
        if (asset) {
            img.src = `${basePath}/src/assets/${asset}`;
        }
    });
};

const highlightActiveNav = (root) => {
    if (!root) {
        return;
    }

    const navLinks = Array.from(root.querySelectorAll('.nav-link[href^="#"]'));
    const sections = Array.from(document.querySelectorAll('[data-section]'));

    if (!navLinks.length || !sections.length) {
        return;
    }

    // Map each section ID to its corresponding nav link so we can toggle classes quickly.
    const linkMap = new Map();
    navLinks.forEach(link => {
        const hash = link.getAttribute('href') || link.dataset.route || '';
        if (!hash.startsWith('#')) {
            return;
        }
        const sectionId = hash.replace('#', '');
        linkMap.set(sectionId, link);
    });

    const setActiveLink = (sectionId) => {
        navLinks.forEach(link => {
            link.classList.toggle('active', linkMap.get(sectionId) === link);
        });
    };

    const initialSection = sections[0];
    if (initialSection) {
        setActiveLink(initialSection.id);
    }

    // Observe each section and activate whichever one is currently most visible.
    const observer = new IntersectionObserver(entries => {
        const intersecting = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (intersecting.length) {
            const targetId = intersecting[0].target.id;
            setActiveLink(targetId);
        }
    }, {
        threshold: 0.45
    });

    sections.forEach(section => observer.observe(section));
};

const loadFragment = async (target, url) => {
    if (!target) {
        return false;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        target.innerHTML = await response.text();
        return true;
    } catch (error) {
        console.warn(`Failed to load layout fragment from "${url}":`, error);
        return false;
    }
};

const loadLayout = async () => {
    const basePath = resolveBasePath();
    const headerTarget = document.querySelector('[data-include="header"]');
    const footerTarget = document.querySelector('[data-include="footer"]');
    const headerUrl = `${basePath}/partials/header.html`;
    const footerUrl = `${basePath}/partials/footer.html`;

    const tasks = [];

    if (headerTarget) {
        tasks.push(
            loadFragment(headerTarget, headerUrl).then(() => {
                applyRouteLinks(headerTarget, basePath);
                applyLogos(headerTarget, basePath);
                highlightActiveNav(headerTarget);
            })
        );
    }

    if (footerTarget) {
        tasks.push(
            loadFragment(footerTarget, footerUrl).then(() => {
                applyRouteLinks(footerTarget, basePath);
                applyLogos(footerTarget, basePath);
                applySocialIcons(footerTarget, basePath);
            })
        );
    }

    await Promise.all(tasks);
    return { basePath, headerElement: headerTarget };
};

const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href.length === 1) {
                return;
            }

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
};

const initHeaderScrollEffect = (headerElement) => {
    if (!headerElement || !headerElement.childElementCount) {
        return;
    }

    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 120 && window.scrollY > lastScrollY) {
            headerElement.style.transform = 'translateY(-100%)';
        } else {
            headerElement.style.transform = 'translateY(0)';
        }
        lastScrollY = window.scrollY;
    }, { passive: true });
};

const initRevealAnimations = () => {
    const animatedElements = document.querySelectorAll('[data-animate]');
    if (!animatedElements.length) {
        return;
    }

    const activateFloat = (target) => {
        if (target.dataset.animate === 'float') {
            const floatingImage = target.querySelector('img');
            floatingImage?.classList.add('is-floating');
        }
    };

    const resetFloat = (target) => {
        if (target.dataset.animate === 'float') {
            const floatingImage = target.querySelector('img');
            floatingImage?.classList.remove('is-floating');
        }
    };

    if (!('IntersectionObserver' in window)) {
        animatedElements.forEach(element => {
            if (element.dataset.delay) {
                element.style.setProperty('--delay', element.dataset.delay);
            }
            element.classList.add('is-visible');
            activateFloat(element);
        });
        return;
    }

    const removalTimers = new WeakMap();

    const isStillVisibleInViewport = (entry) => {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const { top, bottom } = entry.boundingClientRect;
        return bottom > 0 && top < viewportHeight;
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const { target } = entry;
            if (entry.isIntersecting) {
                const pendingRemoval = removalTimers.get(target);
                if (pendingRemoval) {
                    clearTimeout(pendingRemoval);
                    removalTimers.delete(target);
                }
                target.classList.add('is-visible');
                activateFloat(target);
            } else {
                if (removalTimers.has(target)) {
                    return;
                }
                if (entry.intersectionRatio > 0 || isStillVisibleInViewport(entry)) {
                    return;
                }
                const timerId = window.setTimeout(() => {
                    target.classList.remove('is-visible');
                    resetFloat(target);
                    removalTimers.delete(target);
                }, 160);
                removalTimers.set(target, timerId);
            }
        });
    }, {
        threshold: [0, 0.15, 0.35, 0.65, 0.85],
        rootMargin: '0px'
    });

    animatedElements.forEach(element => {
        if (element.dataset.delay) {
            element.style.setProperty('--delay', element.dataset.delay);
        }
        revealObserver.observe(element);
    });
};

const initTypewriter = () => {
    const typeTargets = document.querySelectorAll('[data-typewriter]');
    if (!typeTargets.length) {
        return;
    }

    typeTargets.forEach(target => {
        if (!target.dataset.typewriterText) {
            target.dataset.typewriterText = target.textContent.trim();
        }
        target.textContent = '';
        target.dataset.typewriterRunning = 'false';
    });

    const triggerTypewriter = (target) => {
        const text = target.dataset.typewriterText || '';
        if (!text.length || target.dataset.typewriterRunning === 'true') {
            return;
        }

        target.dataset.typewriterRunning = 'true';
        target.classList.add('is-typing');
        target.classList.remove('has-typed');
        target.textContent = '';

        let index = 0;
        const speed = Number(target.dataset.typewriterSpeed) || 65;

        const writeCharacter = () => {
            target.textContent = text.slice(0, index + 1);
            index += 1;

            if (index >= text.length) {
                target.classList.remove('is-typing');
                target.classList.add('has-typed');
                target.dataset.typewriterRunning = 'false';

                if (target.dataset.typewriterLoop === 'true') {
                    const pause = Number(target.dataset.typewriterInterval) || 2200;
                    window.setTimeout(() => triggerTypewriter(target), pause);
                }
                return;
            }

            window.setTimeout(writeCharacter, speed);
        };

        writeCharacter();
    };

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }

            observer.unobserve(entry.target);
            const delay = Number(entry.target.dataset.typewriterDelay) || 0;
            window.setTimeout(() => triggerTypewriter(entry.target), delay);
        });
    }, {
        threshold: 0.5
    });

    typeTargets.forEach(target => observer.observe(target));
};

const bootstrap = async () => {
    const { headerElement } = await loadLayout();
    initSmoothScroll();
    initHeaderScrollEffect(headerElement);
    initRevealAnimations();
    initTypewriter();
};

bootstrap();
