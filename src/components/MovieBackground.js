import React, { useEffect, useRef } from 'react';
import './MovieBackground.css';

// Movie poster images from assets folder - defined outside component to avoid dependency warnings
const moviePosters = [
  { image: '/assets/ala.jpeg', title: 'ALAI VAIKUNTAPURRAMULOO' },
  { image: '/assets/bahubai.webp', title: 'BAHUBALI' },
  { image: '/assets/friends.jpeg', title: 'FRIENDS' },
  { image: '/assets/fsg.jpeg', title: 'FIFTY SHADES OF GREY' },
  { image: '/assets/lucifer.jpeg', title: 'LUCIFER' },
  { image: '/assets/naruto.jpeg', title: 'NARUTO' },
  { image: '/assets/ora.webp', title: 'ORANGE' },
  { image: '/assets/pushpa.jpeg', title: 'PUSHPA' },
  { image: '/assets/roohi.jpeg', title: 'ROOHI' },
  { image: '/assets/salaar.jpeg', title: 'SALAAR' },
  { image: '/assets/se.jpeg', title: 'SEX EDUCATION' },
  { image: '/assets/shang.jpeg', title: 'SHANG-CHI' },
  { image: '/assets/war.jpeg', title: 'WAR' },
  { image: '/assets/x.jpeg', title: 'X-MEN' },
  { image: '/assets/xt.jpeg', title: 'XTREME' }
];

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
];

const MovieBackground = () => {
  const gridRef = useRef(null);

  useEffect(() => {
    const movieGrid = gridRef.current;
    if (!movieGrid) return;

    // Calculate how many posters we need
    const gridWidth = window.innerWidth * 2.5;
    const gridHeight = window.innerHeight * 2.5;
    const posterWidth = 150;
    const posterHeight = 150;
    const gap = 12;
    
    const columns = Math.ceil(gridWidth / (posterWidth + gap));
    const rows = Math.ceil(gridHeight / (posterHeight + gap));
    const totalPosters = columns * rows;
    
    // Clear existing posters
    movieGrid.innerHTML = '';
    
    // Create posters
    for (let i = 0; i < totalPosters; i++) {
      const movieData = moviePosters[i % moviePosters.length];
      const gradient = gradients[i % gradients.length];
      
      const poster = document.createElement('div');
      poster.className = 'movie-poster';
      poster.style.background = gradient;
      
      // Randomly assign size variations
      const rand = Math.random();
      if (rand < 0.15) {
        poster.classList.add('horizontal');
      } else if (rand < 0.3) {
        poster.classList.add('vertical');
      } else if (rand < 0.35) {
        poster.classList.add('large');
      }
      
      // Add the image
      const img = document.createElement('img');
      img.src = movieData.image;
      img.alt = movieData.title;
      img.loading = 'lazy';
      poster.appendChild(img);
      
      // Create title overlay
      const titleOverlay = document.createElement('div');
      titleOverlay.className = 'poster-title';
      titleOverlay.textContent = movieData.title;
      poster.appendChild(titleOverlay);
      
      // Add random rotation
      const randomRotation = (Math.random() - 0.5) * 2;
      poster.style.transform = `rotate(${randomRotation}deg)`;
      
      movieGrid.appendChild(poster);
    }
  }, []);

  return (
    <div className="movie-background">
      <div className="movie-grid" ref={gridRef}></div>
    </div>
  );
};

export default MovieBackground;
