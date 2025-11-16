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

    const allowsRepeat = (target) => !target.hasAttribute('data-animate-once');

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
            const canRepeat = allowsRepeat(target);

            if (entry.isIntersecting) {
                const pendingRemoval = removalTimers.get(target);
                if (pendingRemoval) {
                    clearTimeout(pendingRemoval);
                    removalTimers.delete(target);
                }
                target.classList.add('is-visible');
                activateFloat(target);

                if (!canRepeat) {
                    revealObserver.unobserve(target);
                }
            } else {
                if (!canRepeat || removalTimers.has(target)) {
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

const initSourceRotators = () => {
    const rotators = document.querySelectorAll('[data-source-rotator]');
    if (!rotators.length) {
        return;
    }

    rotators.forEach(rotator => {
        const words = (rotator.dataset.words || '')
            .split(',')
            .map(word => word.trim())
            .filter(Boolean);

        if (!words.length) {
            return;
        }

        const interval = Number(rotator.closest('[data-source-showcase]')?.dataset.interval) || Number(rotator.dataset.interval) || 1800;
        const animationDuration = 550;
        let index = 0;
        let wordHeight = 0;

        rotator.textContent = '';

        const track = document.createElement('div');
        track.className = 'source-showcase-rotator-track';
        rotator.appendChild(track);

        const createWordEl = (word, options = {}) => {
            const span = document.createElement('span');
            span.className = 'source-showcase-rotator-word';
            span.textContent = word;
            if (options.duplicate) {
                span.setAttribute('aria-hidden', 'true');
            }
            return span;
        };

        words.forEach(word => track.appendChild(createWordEl(word)));
        // Append a duplicate of the first word to enable a seamless loop.
        track.appendChild(createWordEl(words[0], { duplicate: true }));

        const calculateWordHeight = () => {
            wordHeight = rotator.clientHeight || track.firstElementChild?.clientHeight || 0;
            if (wordHeight === 0) {
                wordHeight = parseFloat(getComputedStyle(rotator).lineHeight) || 0;
            }
        };

        const setTransform = (disableAnimation = false) => {
            if (disableAnimation) {
                track.classList.remove('is-animating');
            }
            track.style.transform = `translateY(-${index * wordHeight}px)`;
        };

        calculateWordHeight();
        setTransform(true);
        rotator.setAttribute('data-active-word', words[index]);

        if (words.length < 2) {
            return;
        }

        window.addEventListener('resize', () => {
            const previousHeight = wordHeight;
            calculateWordHeight();
            if (Math.abs(previousHeight - wordHeight) > 0.5) {
                setTransform(true);
            }
        });

        const rotate = () => {
            if (!wordHeight) {
                calculateWordHeight();
            }

            index += 1;
            track.classList.add('is-animating');
            setTransform();

            const currentWordIndex = index === words.length ? 0 : index;
            rotator.setAttribute('data-active-word', words[currentWordIndex]);

            if (index === words.length) {
                window.setTimeout(() => {
                    track.classList.remove('is-animating');
                    index = 0;
                    setTransform(true);
                }, animationDuration);
                return;
            }

            window.setTimeout(() => {
                track.classList.remove('is-animating');
            }, animationDuration);
        };

        window.setInterval(rotate, interval);
    });
};

const initCounters = () => {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) {
        return;
    }

    const formatValue = (value, decimals) => {
        if (decimals > 0) {
            return value.toFixed(decimals);
        }
        return Math.round(value).toString();
    };

    const animationFrames = new WeakMap();
    const activeCounters = new WeakSet();

    const cancelAnimation = (el) => {
        const frameId = animationFrames.get(el);
        if (frameId !== undefined) {
            window.cancelAnimationFrame(frameId);
            animationFrames.delete(el);
        }
    };

    const resetCounter = (el) => {
        cancelAnimation(el);
        const startValue = Number(el.dataset.counterStart ?? 0);
        const prefix = el.dataset.counterPrefix ?? '';
        const suffix = el.dataset.counterSuffix ?? '';
        const decimals = Number(el.dataset.counterDecimals ?? 0);
        el.textContent = `${prefix}${formatValue(startValue, decimals)}${suffix}`;
    };

    const animateCounter = (el) => {
        cancelAnimation(el);
        const startValue = Number(el.dataset.counterStart ?? 0);
        const targetValue = Number(el.dataset.counterTarget ?? startValue);
        const duration = Number(el.dataset.counterDuration ?? 1600);
        const prefix = el.dataset.counterPrefix ?? '';
        const suffix = el.dataset.counterSuffix ?? '';
        const decimals = Number(el.dataset.counterDecimals ?? 0);
        const staticValue = el.dataset.counterStatic;
        const range = targetValue - startValue;

        const applyValue = (value) => {
            el.textContent = `${prefix}${formatValue(value, decimals)}${suffix}`;
        };

        if (Math.abs(range) < Number.EPSILON) {
            if (staticValue) {
                el.textContent = staticValue;
            } else {
                applyValue(targetValue);
            }
            return;
        }

        let startTimestamp;
        const step = (timestamp) => {
            if (startTimestamp === undefined) {
                startTimestamp = timestamp;
            }
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = startValue + range * progress;
            applyValue(value);

            if (progress < 1) {
                const frameId = window.requestAnimationFrame(step);
                animationFrames.set(el, frameId);
            } else {
                animationFrames.delete(el);
                if (staticValue) {
                    el.textContent = staticValue;
                }
            }
        };

        const frameId = window.requestAnimationFrame(step);
        animationFrames.set(el, frameId);
    };

    counters.forEach(counter => resetCounter(counter));

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const { target } = entry;
            if (entry.isIntersecting) {
                if (activeCounters.has(target)) {
                    return;
                }
                activeCounters.add(target);
                animateCounter(target);
                return;
            }

            if (entry.intersectionRatio === 0) {
                activeCounters.delete(target);
                resetCounter(target);
            }
        });
    }, {
        threshold: 0.4
    });

    counters.forEach(counter => observer.observe(counter));
};

const bootstrap = async () => {
    const { headerElement } = await loadLayout();
    initSmoothScroll();
    initHeaderScrollEffect(headerElement);
    initRevealAnimations();
    initTypewriter();
    initSourceRotators();
    initCounters();
};

bootstrap();
