// script.js

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

mobileMenuBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Close mobile menu on link click
document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80; // Account for fixed navbar
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(26, 26, 46, 0.98)';
        navbar.style.backdropFilter = 'blur(20px)';
    } else {
        navbar.style.background = 'rgba(26, 26, 46, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    }
});

// Pricing selection
function selectPlan(planType) {
    // Store selected plan in sessionStorage
    sessionStorage.setItem('selectedPlan', planType);
    
    // Redirect to signup page (you'll need to create this)
    window.location.href = `/signup?plan=${planType}`;
}

// Animate elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Add animation to elements
document.addEventListener('DOMContentLoaded', () => {
    // Animate sections
    const animatedElements = document.querySelectorAll('.step, .benefit, .use-case, .pricing-card, .testimonial');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Animate stats numbers on scroll
    const stats = document.querySelectorAll('.stat-number, .venue-stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                animateNumber(entry.target);
                entry.target.classList.add('animated');
            }
        });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => statsObserver.observe(stat));
});

// Animate numbers
function animateNumber(element) {
    const finalNumber = parseInt(element.textContent.replace(/\D/g, ''));
    const duration = 2000;
    const step = finalNumber / (duration / 16);
    let current = 0;
    
    const isKFormat = element.textContent.includes('K');
    const isPlusFormat = element.textContent.includes('+');
    
    const timer = setInterval(() => {
        current += step;
        if (current >= finalNumber) {
            current = finalNumber;
            clearInterval(timer);
        }
        
        let displayNumber = Math.floor(current);
        if (isKFormat) {
            displayNumber = (displayNumber / 1000).toFixed(0) + 'K';
        }
        if (isPlusFormat) {
            displayNumber += '+';
        }
        
        element.textContent = displayNumber;
    }, 16);
}

// Parallax effect for hero visual
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    const floatingEmojis = document.querySelectorAll('.floating-emoji');
    
    if (heroVisual) {
        heroVisual.style.transform = `translateY(calc(-50% + ${scrolled * 0.3}px))`;
    }
    
    floatingEmojis.forEach((emoji, index) => {
        const speed = 0.1 * (index + 1);
        emoji.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Form validation for email capture (if you add a newsletter form)
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Add hover effect to pricing cards
document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        document.querySelectorAll('.pricing-card').forEach(c => {
            if (c !== card) {
                c.style.opacity = '0.7';
            }
        });
    });
    
    card.addEventListener('mouseleave', () => {
        document.querySelectorAll('.pricing-card').forEach(c => {
            c.style.opacity = '1';
        });
    });
});

// Activity graph animation
const bars = document.querySelectorAll('.bar');
bars.forEach((bar, index) => {
    setTimeout(() => {
        bar.style.animation = 'grow 0.5s ease forwards';
    }, index * 100);
});

// Add grow animation
const style = document.createElement('style');
style.textContent = `
    @keyframes grow {
        from { height: 0; }
        to { height: var(--height); }
    }
`;
document.head.appendChild(style);

// Copy event code functionality (if you add event codes)
function copyEventCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'Code copied!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    });
}

// Countdown timer for live events (if needed)
function startCountdown(endTime) {
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance < 0) {
            clearInterval(timer);
            return;
        }
        
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Update countdown display
        document.querySelector('.countdown')?.textContent = 
            `${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// Initialize AOS-like scroll animations
window.addEventListener('load', () => {
    const elements = document.querySelectorAll('[data-aos]');
    
    const animateOnScroll = () => {
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                element.classList.add('aos-animate');
            }
        });
    };
    
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll();
});

// Handle form submissions (for newsletter or contact forms)
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Here you would send the data to your backend
        console.log('Form submitted:', data);
        
        // Show success message
        form.innerHTML = '<p class="success-message">Thank you! We\'ll be in touch soon.</p>';
    });
});

// Lazy loading for images
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
        }
    });
});

document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
});

// Add some interactive fun with the emojis
document.querySelectorAll('.floating-emoji').forEach(emoji => {
    emoji.addEventListener('click', () => {
        emoji.style.animation = 'spin 0.5s ease';
        setTimeout(() => {
            emoji.style.animation = 'float-around 10s ease-in-out infinite';
        }, 500);
    });
});

// Add spin animation
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.5); }
        to { transform: rotate(360deg) scale(1); }
    }
    
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #7B4FE0, #E91B7D);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .success-message {
        color: #22C55E;
        text-align: center;
        font-size: 1.125rem;
        padding: 2rem;
    }
`;
document.head.appendChild(spinStyle);