import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display the main headline', async ({ page }) => {
        // Target the hero H1 specifically, not the header logo H1
        const heroHeadline = page.locator('section h1');
        await expect(heroHeadline).toContainText(/DEPLOY YOUR/i, { timeout: 15000 });
        await expect(heroHeadline).toContainText(/NARRATIVE/i, { timeout: 15000 });
    });

    test('should display the Synthesis Studio branding', async ({ page }) => {
        const branding = page.getByText(/Synthesis Studio \/\/ v2.0 Live/i);
        await expect(branding).toBeVisible({ timeout: 15000 });
    });

    test('should have primary call to action buttons', async ({ page }) => {
        const startButton = page.getByRole('button', { name: /START CREATING/i });
        const demoButton = page.getByRole('button', { name: /WATCH SIMULATION/i });
        
        await expect(startButton).toBeVisible({ timeout: 15000 });
        await expect(demoButton).toBeVisible({ timeout: 15000 });
    });

    test('should display all pricing tiers', async ({ page }) => {
        // Find Novice tier
        await expect(page.getByRole('heading', { level: 3, name: /Novice/i })).toBeVisible({ timeout: 15000 });
        // Find Hobbyist tier
        await expect(page.getByRole('heading', { level: 3, name: /Hobbyist/i })).toBeVisible({ timeout: 15000 });
        // Find Semi-Pro tier
        await expect(page.getByRole('heading', { level: 3, name: /Semi-Pro/i })).toBeVisible({ timeout: 15000 });
    });

    test('should display the testimonials section', async ({ page }) => {
        const testimonialHeadline = page.getByText(/Proven Deployment/i);
        await expect(testimonialHeadline).toBeVisible({ timeout: 15000 });
        
        // Check for specific personas
        await expect(page.getByText(/SARA_DOCS/i)).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/GARY_ED/i)).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/PAUL_STORY/i)).toBeVisible({ timeout: 15000 });
    });

    test('should open auth modal when clicking START CREATING', async ({ page }) => {
        await page.getByRole('button', { name: /START CREATING/i }).click();
        
        // Wait for modal to appear - look for modal wrapper to be sure
        const modalHeading = page.getByRole('heading', { name: /Create Account|Welcome Back/i });
        await expect(modalHeading).toBeVisible({ timeout: 15000 });
    });

    test('should open auth modal with selected plan when clicking pricing buttons', async ({ page }) => {
        // Click on "SELECT premium" button
        const premiumButton = page.getByRole('button', { name: /SELECT_PREMIUM/i });
        await premiumButton.click();
        
        // Check for modal heading
        await expect(page.getByRole('heading', { name: /Create Account|Welcome Back/i })).toBeVisible({ timeout: 15000 });
        
        // Verify selected plan badge in modal
        const planBadge = page.getByText(/Selected Plan: PREMIUM/i);
        await expect(planBadge).toBeVisible({ timeout: 15000 });
    });
});
