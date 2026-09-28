export declare class Layout {
    private readonly root;
    constructor(packageDir: string);
    /** The artifact path of a file on disk, or undefined when it belongs to neither the package nor a dependency. */
    artifactPathOf(file: string): string | undefined;
}
