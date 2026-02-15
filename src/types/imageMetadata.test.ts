import {
  getRandomImage,
  getImageById,
  getImagesByCategory,
  ImageMetadataCollection,
} from './imageMetadata';

describe('Image Metadata Utilities', () => {
  const mockMetadata: ImageMetadataCollection = {
    images: [
      {
        id: 'friendly-elephant',
        filename: 'friendly-elephant.svg',
        path: '/images/friendly-elephant.svg',
        title: 'Friendly Elephant',
        description: 'A cute gray elephant',
        category: 'animals',
        ageAppropriate: '3-8 years',
        conversationTopics: ['What do elephants eat?'],
        detectedObjects: ['elephant', 'trunk'],
        colors: ['gray'],
        mood: 'friendly',
      },
      {
        id: 'sunny-garden',
        filename: 'sunny-garden.svg',
        path: '/images/sunny-garden.svg',
        title: 'Sunny Garden',
        description: 'A beautiful garden scene',
        category: 'nature',
        ageAppropriate: '3-8 years',
        conversationTopics: ['What colors are the flowers?'],
        detectedObjects: ['sun', 'flowers'],
        colors: ['blue', 'yellow', 'green'],
        mood: 'cheerful',
      },
      {
        id: 'toy-train',
        filename: 'toy-train.svg',
        path: '/images/toy-train.svg',
        title: 'Colorful Toy Train',
        description: 'A cheerful toy train',
        category: 'toys',
        ageAppropriate: '3-8 years',
        conversationTopics: ['What color is the train?'],
        detectedObjects: ['train', 'wheels'],
        colors: ['red', 'blue'],
        mood: 'playful',
      },
    ],
  };

  describe('getRandomImage', () => {
    it('should return an image from the collection', () => {
      const image = getRandomImage(mockMetadata);
      expect(mockMetadata.images).toContain(image);
    });

    it('should return a valid image object with all required properties', () => {
      const image = getRandomImage(mockMetadata);
      expect(image).toHaveProperty('id');
      expect(image).toHaveProperty('filename');
      expect(image).toHaveProperty('path');
      expect(image).toHaveProperty('title');
      expect(image).toHaveProperty('description');
      expect(image).toHaveProperty('category');
      expect(image).toHaveProperty('conversationTopics');
    });
  });

  describe('getImageById', () => {
    it('should return the correct image when ID exists', () => {
      const image = getImageById(mockMetadata, 'friendly-elephant');
      expect(image).toBeDefined();
      expect(image?.id).toBe('friendly-elephant');
      expect(image?.title).toBe('Friendly Elephant');
    });

    it('should return undefined when ID does not exist', () => {
      const image = getImageById(mockMetadata, 'non-existent-id');
      expect(image).toBeUndefined();
    });

    it('should return the correct image for each valid ID', () => {
      const elephant = getImageById(mockMetadata, 'friendly-elephant');
      const garden = getImageById(mockMetadata, 'sunny-garden');
      const train = getImageById(mockMetadata, 'toy-train');

      expect(elephant?.category).toBe('animals');
      expect(garden?.category).toBe('nature');
      expect(train?.category).toBe('toys');
    });
  });

  describe('getImagesByCategory', () => {
    it('should return all images in the animals category', () => {
      const animals = getImagesByCategory(mockMetadata, 'animals');
      expect(animals).toHaveLength(1);
      expect(animals[0].id).toBe('friendly-elephant');
    });

    it('should return all images in the nature category', () => {
      const nature = getImagesByCategory(mockMetadata, 'nature');
      expect(nature).toHaveLength(1);
      expect(nature[0].id).toBe('sunny-garden');
    });

    it('should return all images in the toys category', () => {
      const toys = getImagesByCategory(mockMetadata, 'toys');
      expect(toys).toHaveLength(1);
      expect(toys[0].id).toBe('toy-train');
    });

    it('should return empty array for category with no images', () => {
      const scenes = getImagesByCategory(mockMetadata, 'scenes');
      expect(scenes).toHaveLength(0);
    });

    it('should return multiple images if category has multiple entries', () => {
      const extendedMetadata: ImageMetadataCollection = {
        images: [
          ...mockMetadata.images,
          {
            id: 'ocean-scene',
            filename: 'ocean-scene.svg',
            path: '/images/ocean-scene.svg',
            title: 'Ocean Scene',
            description: 'Underwater scene',
            category: 'nature',
            ageAppropriate: '3-8 years',
            conversationTopics: ['What lives in the ocean?'],
            detectedObjects: ['fish', 'water'],
            colors: ['blue'],
            mood: 'calm',
          },
        ],
      };

      const nature = getImagesByCategory(extendedMetadata, 'nature');
      expect(nature).toHaveLength(2);
      expect(nature.map((img) => img.id)).toContain('sunny-garden');
      expect(nature.map((img) => img.id)).toContain('ocean-scene');
    });
  });

  describe('Image metadata structure', () => {
    it('should have valid conversation topics for each image', () => {
      mockMetadata.images.forEach((image) => {
        expect(Array.isArray(image.conversationTopics)).toBe(true);
        expect(image.conversationTopics.length).toBeGreaterThan(0);
      });
    });

    it('should have detected objects for each image', () => {
      mockMetadata.images.forEach((image) => {
        expect(Array.isArray(image.detectedObjects)).toBe(true);
        expect(image.detectedObjects.length).toBeGreaterThan(0);
      });
    });

    it('should have colors for each image', () => {
      mockMetadata.images.forEach((image) => {
        expect(Array.isArray(image.colors)).toBe(true);
        expect(image.colors.length).toBeGreaterThan(0);
      });
    });

    it('should have valid paths starting with /images/', () => {
      mockMetadata.images.forEach((image) => {
        expect(image.path).toMatch(/^\/images\//);
      });
    });
  });
});
