function initGlide() {
    new Glide('.glide', {
        type: 'carousel',
        perView: 3,
        gap: 20,
        breakpoints: {
            992: {
                perView: 1
            },
        }
    }).mount();

    new Glide('.glide2', {
        type: 'carousel',
        perView: 3,
        gap: 20,
        breakpoints: {
            992: {
                perView: 2
            },
            762: {
                perView: 1
            },
        }
    }).mount();
}
initGlide();

function initPhoneInput() {
    const phoneInput = document.getElementById('phone');

    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 11) {
            value = value.slice(0, 11);
        }

        if (value.length > 6) {
            value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        } else if (value.length > 2) {
            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        } else if (value.length > 0) {
            value = `(${value}`;
        }

        e.target.value = value;
    });
}
initPhoneInput();

function initDateInput() {
    const phoneInput = document.getElementById('bornDate');

    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 8) {
            value = value.slice(0, 8);
        }

        if (value.length > 6) {
            value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
        } else if (value.length > 2) {
            value = `${value.slice(0, 2)}/${value.slice(2)}`;
        }

        e.target.value = value;
    });
}
initDateInput();

function initScrollToTop() {
    const toTop = document.getElementsByClassName('js-to-top')

    document.querySelectorAll('.js-to-top').forEach(el => {
        el.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });
}

initScrollToTop();
