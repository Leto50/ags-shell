export interface PaginationResult<T> {
    items: T[]
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    currentPage: number
}

/**
 * Paginate an array of items
 * @param items Array of items to paginate
 * @param page Current page number (1-indexed)
 * @param perPage Number of items per page
 * @returns Paginated result with items and navigation info
 */
export function paginateItems<T>(items: T[], page: number, perPage: number): PaginationResult<T> {
    const totalPages = Math.ceil(items.length / perPage)
    const validPage = Math.max(1, Math.min(page, totalPages || 1))

    const start = (validPage - 1) * perPage
    const end = validPage * perPage
    const paginatedItems = items.slice(start, end)

    return {
        items: paginatedItems,
        totalPages,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1,
        currentPage: validPage
    }
}

/**
 * Calculate total number of pages
 * @param total Total number of items
 * @param perPage Number of items per page
 * @returns Total number of pages
 */
export function getTotalPages(total: number, perPage: number): number {
    return Math.ceil(total / perPage) || 1
}

/**
 * Get visible page numbers for pagination UI (with ellipsis support)
 * @param currentPage Current page number (1-indexed)
 * @param totalPages Total number of pages
 * @param maxVisible Maximum number of page buttons to show
 * @returns Array of page numbers to display (0 represents ellipsis)
 */
export function getVisiblePageNumbers(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 5
): (number | 0)[] {
    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 0)[] = []
    const sidePages = Math.floor((maxVisible - 3) / 2) // Reserve 3 for first, last, and current

    // Always show first page
    pages.push(1)

    // Determine range around current page
    let rangeStart = Math.max(2, currentPage - sidePages)
    let rangeEnd = Math.min(totalPages - 1, currentPage + sidePages)

    // Adjust if we're near the beginning or end
    if (currentPage <= sidePages + 2) {
        rangeEnd = Math.min(totalPages - 1, maxVisible - 1)
    } else if (currentPage >= totalPages - sidePages - 1) {
        rangeStart = Math.max(2, totalPages - maxVisible + 2)
    }

    // Add ellipsis before range if needed
    if (rangeStart > 2) {
        pages.push(0) // 0 represents ellipsis
    }

    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i)
    }

    // Add ellipsis after range if needed
    if (rangeEnd < totalPages - 1) {
        pages.push(0) // 0 represents ellipsis
    }

    // Always show last page (if not already included)
    if (totalPages > 1) {
        pages.push(totalPages)
    }

    return pages
}
