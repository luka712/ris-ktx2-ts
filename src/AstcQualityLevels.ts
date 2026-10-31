/**
 * ASTC encoder quality levels.
 *
 * Higher quality levels generally produce better compression quality
 * at the cost of increased encoding time.
 */
export enum AstcQualityLevel {
    /** Fastest encoding with the lowest compression effort. */
    FASTEST = "FASTEST",
    /** Fast encoding with low compression effort. */
    FAST = "FAST",
    /** Balanced encoding speed and compression quality. */
    MEDIUM = "MEDIUM",
    /** Thorough encoding with higher compression quality. */
    THOROUGH = "THOROUGH",
    /** Exhaustive encoding with the highest compression effort. */
    EXHAUSTIVE = "EXHAUSTIVE",
}