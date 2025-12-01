(function($) {

  "use strict";

  var initPreloader = function() {
    $(document).ready(function($) {
    var Body = $('body');
        Body.addClass('preloader-site');
    });
    // Use both window.load and window.onload for better compatibility
    $(window).on('load', function() {
        $('.preloader-wrapper').addClass('hidden').fadeOut(500);
        $('body').removeClass('preloader-site');
    });
    // Fallback: hide preloader after a short delay if window.load doesn't fire
    setTimeout(function() {
        $('.preloader-wrapper').addClass('hidden').fadeOut(500);
        $('body').removeClass('preloader-site');
    }, 1000);
    // Emergency fallback: force hide after 2 seconds
    setTimeout(function() {
        $('.preloader-wrapper').addClass('hidden').css('display', 'none');
        $('body').removeClass('preloader-site');
    }, 2000);
  }

  // init Chocolat light box
	var initChocolat = function() {
		Chocolat(document.querySelectorAll('.image-link'), {
		  imageSize: 'contain',
		  loop: true,
		})
	}

  var initSwiper = function() {
    // Wait for Swiper library to be available
    var initMainSwiper = function() {
      // Check if Swiper library is loaded
      if (typeof Swiper === 'undefined') {
        console.warn('Swiper library is not loaded yet, retrying...');
        setTimeout(initMainSwiper, 100);
        return;
      }

      // Check if main-swiper element exists
      var mainSwiperEl = document.querySelector(".main-swiper");
      if (!mainSwiperEl) {
        console.warn('Main swiper element not found, retrying...');
        setTimeout(initMainSwiper, 100);
        return;
      }

      // Check if already initialized
      if (mainSwiperEl.swiper) {
        console.log('Main swiper already initialized');
        return;
      }

      try {
        var swiper = new Swiper(".main-swiper", {
          speed: 500,
          autoplay: {
            delay: 4000,
            disableOnInteraction: false,
          },
          loop: true,
          pagination: {
            el: ".swiper-pagination",
            clickable: true,
          },
        });
        console.log('Main swiper initialized successfully');
      } catch (error) {
        console.error('Error initializing main swiper:', error);
      }
    };
    
    // Start initialization
    initMainSwiper();

    // Don't initialize category carousel here - it will be initialized after categories are loaded from API
    // The category carousel will be initialized in app.js after categories are fetched
    var category_swiper = null; // Will be set by app.js after categories load

    var brand_swiper = new Swiper(".brand-carousel", {
      slidesPerView: 4,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".brand-carousel-next",
        prevEl: ".brand-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 2,
        },
        768: {
          slidesPerView: 2,
        },
        991: {
          slidesPerView: 3,
        },
        1500: {
          slidesPerView: 4,
        },
      }
    });

    var products_swiper = new Swiper(".products-carousel", {
      slidesPerView: 5,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".products-carousel-next",
        prevEl: ".products-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 3,
        },
        991: {
          slidesPerView: 4,
        },
        1500: {
          slidesPerView: 6,
        },
      }
    });
  }

  var initProductQty = function(){

    $('.product-qty').each(function(){

      var $el_product = $(this);
      var quantity = 0;

      $el_product.find('.quantity-right-plus').click(function(e){
          e.preventDefault();
          var quantity = parseInt($el_product.find('#quantity').val());
          $el_product.find('#quantity').val(quantity + 1);
      });

      $el_product.find('.quantity-left-minus').click(function(e){
          e.preventDefault();
          var quantity = parseInt($el_product.find('#quantity').val());
          if(quantity>0){
            $el_product.find('#quantity').val(quantity - 1);
          }
      });

    });

  }

  // init jarallax parallax
  var initJarallax = function() {
    jarallax(document.querySelectorAll(".jarallax"));

    jarallax(document.querySelectorAll(".jarallax-keep-img"), {
      keepImg: true,
    });
  }

  // Custom Category Dropdown
  var initCustomDropdown = function() {
    const dropdownBtn = document.getElementById('categoryDropdownBtn');
    const dropdownMenu = document.getElementById('categoryDropdownMenu');
    const dropdownOptions = dropdownMenu ? dropdownMenu.querySelectorAll('.dropdown-option') : [];
    const dropdownSelected = dropdownBtn ? dropdownBtn.querySelector('.dropdown-selected') : null;

    if (!dropdownBtn || !dropdownMenu) return;

    // Toggle dropdown
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isExpanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
      dropdownBtn.setAttribute('aria-expanded', !isExpanded);
      dropdownMenu.classList.toggle('show', !isExpanded);
    });

    // Handle option selection
    dropdownOptions.forEach(option => {
      option.addEventListener('click', function(e) {
        e.stopPropagation();
        const value = this.getAttribute('data-value');
        
        // Update selected text
        if (dropdownSelected) {
          const optionText = this.querySelector('.dropdown-option-text');
          dropdownSelected.textContent = optionText ? optionText.textContent : value;
        }
        
        // Update active state
        dropdownOptions.forEach(opt => opt.classList.remove('active', 'selecting'));
        this.classList.add('active', 'selecting');
        
        // Remove selecting class after animation
        setTimeout(() => {
          this.classList.remove('selecting');
        }, 400);
        
        // Close dropdown
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownMenu.classList.remove('show');
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownMenu.classList.remove('show');
      }
    });

    // Set initial active state
    if (dropdownOptions.length > 0) {
      dropdownOptions[0].classList.add('active');
    }
  };

  // Mobile Category Dropdown
  var initMobileDropdown = function() {
    const mobileDropdownBtn = document.getElementById('mobileCategoryDropdownBtn');
    const mobileDropdownMenu = document.getElementById('mobileCategoryDropdownMenu');
    const mobileDropdownOptions = mobileDropdownMenu ? mobileDropdownMenu.querySelectorAll('.mobile-dropdown-option') : [];
    const mobileDropdownSelected = mobileDropdownBtn ? mobileDropdownBtn.querySelector('.mobile-dropdown-selected') : null;

    if (!mobileDropdownBtn || !mobileDropdownMenu) return;

    // Toggle dropdown
    mobileDropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isExpanded = mobileDropdownBtn.getAttribute('aria-expanded') === 'true';
      mobileDropdownBtn.setAttribute('aria-expanded', !isExpanded);
      mobileDropdownMenu.classList.toggle('show', !isExpanded);
    });

    // Handle option selection
    mobileDropdownOptions.forEach(option => {
      option.addEventListener('click', function(e) {
        e.stopPropagation();
        const value = this.getAttribute('data-value');
        
        // Update selected text
        if (mobileDropdownSelected) {
          mobileDropdownSelected.textContent = value;
        }
        
        // Update active state
        mobileDropdownOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // Close dropdown
        mobileDropdownBtn.setAttribute('aria-expanded', 'false');
        mobileDropdownMenu.classList.remove('show');
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!mobileDropdownBtn.contains(e.target) && !mobileDropdownMenu.contains(e.target)) {
        mobileDropdownBtn.setAttribute('aria-expanded', 'false');
        mobileDropdownMenu.classList.remove('show');
      }
    });
  };

  // document ready
  $(document).ready(function() {
    
    initPreloader();
    initSwiper();
    initProductQty();
    initJarallax();
    initChocolat();
    initCustomDropdown();
    initMobileDropdown();

  }); // End of a document

})(jQuery);