<template>
    <div class="h-screen w-screen flex flex-col overflow-hidden">
        <main-window-nav></main-window-nav>
        <div class="flex flex-1 overflow-hidden">
            <main-window-menubar></main-window-menubar>
            <div class="w-full overflow-hidden">
                <slot></slot>
            </div>
        </div>
    </div>
</template>