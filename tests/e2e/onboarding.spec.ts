import { test, expect } from '@playwright/test';

test.describe('Project Onboarding Flow', () => {

    test('should create a new project from a topic suggestion', async ({ page }) => {
        test.setTimeout(60000);
        // 1. Start at Dashboard
        await page.goto('http://localhost:3000/');

        // 2. Navigate to Topic Research (Direct)
        console.log('Navigating to Topics directly...');
        await page.goto('http://localhost:3000/topics');

        // 3. Handle Auth if not logged in
        const mockAuthButton = page.locator('button', { hasText: /Sign in with Mock Account/i });
        console.log('Checking for mock auth button...');
        if (await mockAuthButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Clicking mock auth button...');
            await mockAuthButton.click();
            await page.waitForLoadState('networkidle');
        }

        console.log('Current URL:', page.url());
        await expect(page).toHaveURL(/.*\/topics/);

        // 4. Search for a topic
        const searchInput = page.getByPlaceholder(/Enter a broad topic/);
        await searchInput.fill('Ancient Civilizations');
        await page.getByRole('button', { name: 'Search' }).click();

        // 5. Wait for suggestions and select one
        const selectButton = page.getByRole('button', { name: 'Select this Topic' }).first();
        await expect(selectButton).toBeVisible({ timeout: 10000 });
        await selectButton.click();

        // 6. Verify New Project Page
        await expect(page).toHaveURL(/\/projects\/new/);
        await expect(page.getByText('Create New Project')).toBeVisible();

        // 7. Customize Title and Start Project
        const titleInput = page.getByPlaceholder('Enter a compelling title');
        await titleInput.clear();
        await titleInput.fill('The Mysteries of Atlantis');

        await page.getByRole('button', { name: '✨ Start Project' }).click();

        // 8. Verify Project Detail Page & Cost Bar
        await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9_-]+/);
        await expect(page.getByText('The Mysteries of Atlantis')).toBeVisible();

        // 9. CHECK THE COST BAR
        const costBar = page.getByText('Estimated Project Cost');
        await expect(costBar).toBeVisible();

        // Verify initial spent is $0.00
        await expect(page.getByText('Spent: $0.00')).toBeVisible();

        // Projected should be visible and greater than 0
        const projectedSpan = page.locator('.text-blue-400');
        await expect(projectedSpan).toBeVisible();
        const projectedValue = await projectedSpan.innerText();
        expect(parseFloat(projectedValue.replace('$', ''))).toBeGreaterThan(0);
    });
});
