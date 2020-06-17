import { FieldMappings } from './FieldMappings';
import { ProxyManager } from './ProxyManager';
import { PatchOperation } from './PatchOperation';
import { MirrorHandler } from './MirrorHandler';

export interface ISourceHandler<TSource> {
    readonly source: TSource;
    setField(field: keyof TSource, val: TSource[keyof TSource]): void;
    deleteField(field: keyof TSource): void;
    unmappedDescendantChanged(): void;
}

export class SourceHandler<TSource, TMirror, TKey>
    implements ISourceHandler<TSource> {
    private readonly mirrorHandlers = new Map<
        TKey,
        MirrorHandler<TSource, TMirror, TKey>
    >();

    constructor(
        public readonly source: TSource,
        private readonly getMappings: (
            key: TKey
        ) => FieldMappings<TSource, TMirror>,
        public readonly proxyManager: ProxyManager<TKey>,
        private readonly afterChange?: () => void
    ) {}

    public createMirror(
        key: TKey,
        patchCallback?: (operation: PatchOperation) => void,
        assignMirror?: (mirror: TMirror) => TMirror,
        assignBeforePopulating?: boolean
    ): TMirror {
        const handler = new MirrorHandler<TSource, TMirror, TKey>(
            key,
            this,
            this.getMappings(key),
            patchCallback,
            assignMirror,
            assignBeforePopulating
        );

        this.mirrorHandlers.set(key, handler);

        return handler.mirror;
    }

    public removeMirror(key: TKey) {
        this.mirrorHandlers.delete(key);
        this.proxyManager.removeKey(key);
    }

    public setField(field: keyof TSource, val: TSource[keyof TSource]) {
        for (const [, mirrorHandler] of this.mirrorHandlers) {
            mirrorHandler.runSetOperation(field, val);
        }

        if (this.afterChange) {
            this.afterChange();
        }
    }

    public deleteField(field: keyof TSource) {
        for (const [, mirrorHandler] of this.mirrorHandlers) {
            mirrorHandler.runDeleteOperation(field);
        }

        if (this.afterChange) {
            this.afterChange();
        }
    }

    public unmappedDescendantChanged() {
        for (const [, mirrorHandler] of this.mirrorHandlers) {
            if (mirrorHandler.beforeChange) {
                mirrorHandler.beforeChange();
            }
        }

        if (this.afterChange) {
            this.afterChange();
        }
    }
}
