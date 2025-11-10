<template>
    <div class="h-screen w-screen flex flex-col overflow-hidden">
        <main-window-nav class="hidden md:block"></main-window-nav>
        <main-modal-nav class="md:hidden"></main-modal-nav>
        <div class="flex flex-1 overflow-hidden">
            <main-window-menubar class="hidden md:flex"></main-window-menubar>
            <div class="w-full overflow-hidden">
                <slot></slot>
            </div>
        </div>
        <main-modal-menubar class="md:hidden relative"></main-modal-menubar>
    </div>
</template>